/**
 * Scheduler Service
 * Runs scheduled analyses automatically based on their frequency settings
 */

import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase.js';
import { TOKEN_COSTS } from '../config/stripe.js';
import { extractVideoId, getVideoDetails, scrapeYouTubeComments } from './youtube.js';
import { extractTikTokVideoId, getTikTokCommentCount, scrapeTikTokComments } from './tiktok.js';
import { processComments, extractThemesAndKeywords } from './commentProcessor.js';
import { analyzeComments } from './openai.js';
import { aggregateSentiment } from './sentiment.js';

// Track if scheduler is running to prevent overlap
let isProcessing = false;

/**
 * Calculate next run time from a frequency
 */
function calculateNextRun(frequency, fromDate = new Date()) {
  const next = new Date(fromDate);
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }
  return next.toISOString();
}

/**
 * Calculate token cost for an analysis
 */
function calculateTokenCost(platform, commentCount, includeText, includeMarketing) {
  let cost = 0;

  if (platform === 'youtube') {
    cost += Math.max(1, Math.ceil(commentCount / 1000) * TOKEN_COSTS.youtube_per_1000_comments);
  } else {
    cost += Math.max(1, Math.ceil(commentCount / 100) * TOKEN_COSTS.tiktok_per_100_comments);
  }

  if (includeText) cost += TOKEN_COSTS.text_analysis;
  if (includeMarketing) cost += TOKEN_COSTS.marketing_analysis;

  return Math.max(1, cost);
}

/**
 * Run a single scheduled analysis
 */
async function runScheduledAnalysis(schedule) {
  const startTime = Date.now();
  console.log(`[Scheduler] Running scheduled analysis: ${schedule.id} for ${schedule.video_url}`);

  try {
    // 1. Get video details and comment count
    let videoId, videoDetails;

    if (schedule.platform === 'youtube') {
      videoId = extractVideoId(schedule.video_url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }
      videoDetails = await getVideoDetails(videoId);
    } else if (schedule.platform === 'tiktok') {
      videoId = await extractTikTokVideoId(schedule.video_url);
      const count = await getTikTokCommentCount(videoId);
      videoDetails = { id: videoId, title: schedule.video_title || 'TikTok Video', commentCount: count };
    } else {
      throw new Error('Invalid platform');
    }

    const commentsToFetch = Math.min(schedule.max_comments || 1000, videoDetails.commentCount || 1000);

    // 2. Calculate token cost
    const tokenCost = calculateTokenCost(
      schedule.platform,
      commentsToFetch,
      schedule.include_text_analysis,
      schedule.include_marketing
    );

    // 3. Check user balance and deduct tokens
    const { data: deductResult, error: deductError } = await supabaseAdmin.rpc('deduct_tokens', {
      p_user_id: schedule.user_id,
      p_amount: tokenCost,
      p_description: `Scheduled ${schedule.platform} analysis: ${videoDetails.title || videoId}`,
      p_metadata: { platform: schedule.platform, url: schedule.video_url, scheduled: true, schedule_id: schedule.id }
    });

    if (deductError || !deductResult?.[0]?.success) {
      const errorMsg = deductResult?.[0]?.message || 'Insufficient tokens';
      console.log(`[Scheduler] Token deduction failed for schedule ${schedule.id}: ${errorMsg}`);

      // Update schedule with error and pause it
      await supabaseAdmin.from('scheduled_analyses').update({
        last_error: `Insufficient tokens (needed ${tokenCost})`,
        is_active: false, // Pause the schedule
      }).eq('id', schedule.id);

      return { success: false, error: errorMsg };
    }

    // 4. Create analysis record
    const { data: analysis, error: createError } = await supabaseAdmin
      .from('analyses')
      .insert({
        user_id: schedule.user_id,
        analysis_type: `${schedule.platform}_comments`,
        platform: schedule.platform,
        video_url: schedule.video_url,
        video_title: videoDetails.title || schedule.video_title,
        tokens_used: tokenCost,
        status: 'processing',
        has_video: false,
        is_my_video: schedule.is_my_video || false,
        is_competitor: schedule.is_competitor || false,
        creator_notes: schedule.creator_notes || null,
        competitor_notes: schedule.competitor_notes || null,
      })
      .select()
      .single();

    if (createError) {
      throw new Error('Failed to create analysis record: ' + createError.message);
    }

    // 5. Run the analysis (simplified version without video upload)
    await processScheduledAnalysisJob({
      analysisId: analysis.id,
      videoId,
      platform: schedule.platform,
      commentsToFetch,
      includeText: schedule.include_text_analysis,
      includeMkt: schedule.include_marketing,
      product_description: schedule.product_description,
      isMyVideo: schedule.is_my_video || false,
      isCompetitor: schedule.is_competitor || false,
      creatorNotes: schedule.creator_notes,
      competitorNotes: schedule.competitor_notes,
      startTime,
    });

    // 6. Update schedule with success
    const nextRun = calculateNextRun(schedule.frequency);
    await supabaseAdmin.from('scheduled_analyses').update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRun,
      run_count: (schedule.run_count || 0) + 1,
      last_analysis_id: analysis.id,
      last_error: null,
    }).eq('id', schedule.id);

    console.log(`[Scheduler] Completed scheduled analysis: ${schedule.id}, analysis_id: ${analysis.id}`);
    return { success: true, analysisId: analysis.id };

  } catch (error) {
    console.error(`[Scheduler] Error running schedule ${schedule.id}:`, error);

    // Update schedule with error (don't pause - might be temporary)
    await supabaseAdmin.from('scheduled_analyses').update({
      last_error: error.message,
    }).eq('id', schedule.id);

    return { success: false, error: error.message };
  }
}

/**
 * Process a scheduled analysis job (simplified version of the main analysis job)
 */
async function processScheduledAnalysisJob({
  analysisId, videoId, platform, commentsToFetch,
  includeText, includeMkt, product_description,
  isMyVideo, isCompetitor, creatorNotes, competitorNotes, startTime
}) {
  try {
    // 1. Scrape Comments
    let rawComments = [];

    if (platform === 'youtube') {
      rawComments = await scrapeYouTubeComments(videoId, commentsToFetch);
    } else {
      rawComments = await scrapeTikTokComments(videoId, commentsToFetch);
    }

    if (!rawComments || !rawComments.length) {
      throw new Error('No comments found');
    }

    // 2. Process Comments
    const { comments: processedComments, stats: filterStats } = processComments(rawComments);

    // 3. Aggregate Sentiment
    const sentimentResults = processedComments.map(c => c.sentiment).filter(Boolean);
    const sentimentScores = aggregateSentiment(sentimentResults);

    // 4. Save metadata
    await supabaseAdmin.from('analyses').update({
      filter_stats: filterStats,
      sentiment_scores: sentimentScores,
      comment_count: rawComments.length,
      status: 'processing'
    }).eq('id', analysisId);

    // Save raw comments
    await supabaseAdmin.from('analyses').update({
      raw_comments: processedComments
    }).eq('id', analysisId);

    // 5. Marketing context (if enabled)
    let marketingContext = null;
    if (includeMkt && product_description) {
      marketingContext = { description: product_description, image_base64: null };
    }

    // 6. AI Analysis
    let analysisResult = { summary: null, keywords: [], themes: [], stats: null };
    if (includeText) {
      try {
        analysisResult = await analyzeComments(
          processedComments,
          platform,
          marketingContext,
          null, // videoTranscript
          null, // videoFrames
          isMyVideo,
          creatorNotes,
          isCompetitor,
          competitorNotes
        );
      } catch (aiErr) {
        console.error('[Scheduler] AI Error:', aiErr);
        const fallback = extractThemesAndKeywords(processedComments.map(c => c.clean_text));
        analysisResult = {
          ...fallback,
          stats: { total: rawComments.length, analyzed: 0, coverage: 0 },
          summary: `**AI Analysis Failed:** ${aiErr.message}\n\nKeywords extracted successfully.`
        };
      }
    } else {
      const fallback = extractThemesAndKeywords(processedComments.map(c => c.clean_text));
      analysisResult = {
        ...fallback,
        stats: { total: rawComments.length, analyzed: 0, coverage: 0 },
        summary: 'AI analysis not requested.'
      };
    }

    const processingTime = Date.now() - startTime;

    // 7. Final Update
    await supabaseAdmin.from('analyses').update({
      status: 'completed',
      summary: analysisResult.summary,
      keywords: analysisResult.keywords,
      themes: analysisResult.themes,
      processing_time_ms: processingTime,
      video_score: analysisResult.videoScore || null,
      priority_improvement: analysisResult.priorityImprovement || null,
      score_breakdown: analysisResult.scoreBreakdown || null,
      notes_assessment: analysisResult.notesAssessment || null,
      marketing_insights: analysisResult.marketingInsights || null,
      competitor_analysis: analysisResult.competitorAnalysis || null,
      action_items: analysisResult.actionItems || [],
    }).eq('id', analysisId);

    console.log(`[Scheduler] Analysis ${analysisId} completed in ${processingTime}ms`);

  } catch (error) {
    console.error('[Scheduler] Job Error:', error);
    await supabaseAdmin.from('analyses').update({
      status: 'failed',
      error_message: error.message
    }).eq('id', analysisId);
    throw error;
  }
}

/**
 * Check for and process due scheduled analyses
 */
async function processDueSchedules() {
  if (isProcessing) {
    console.log('[Scheduler] Already processing, skipping this tick');
    return;
  }

  isProcessing = true;

  try {
    // Find schedules that are due (next_run_at <= now and is_active = true)
    const { data: dueSchedules, error } = await supabaseAdmin
      .from('scheduled_analyses')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', new Date().toISOString())
      .order('next_run_at', { ascending: true })
      .limit(5); // Process max 5 at a time to avoid overwhelming the system

    if (error) {
      console.error('[Scheduler] Error fetching due schedules:', error);
      return;
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return; // Nothing to process
    }

    console.log(`[Scheduler] Found ${dueSchedules.length} due schedules`);

    // Process each schedule sequentially to avoid rate limits
    for (const schedule of dueSchedules) {
      await runScheduledAnalysis(schedule);
      // Small delay between analyses to be nice to APIs
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('[Scheduler] Error in processDueSchedules:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the scheduler
 */
export function startScheduler() {
  console.log('[Scheduler] Starting scheduled analysis processor...');

  // Run every minute
  cron.schedule('* * * * *', () => {
    processDueSchedules();
  });

  // Also run immediately on startup to catch any missed schedules
  setTimeout(() => {
    console.log('[Scheduler] Running initial check for due schedules...');
    processDueSchedules();
  }, 5000); // Wait 5 seconds for server to fully start

  console.log('[Scheduler] Scheduler started - checking every minute for due analyses');
}

export default { startScheduler };
