import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { TOKEN_COSTS } from '../config/stripe.js';
import { validateEngagement } from '../services/engagementValidator.js';
import { extractVideoId, getVideoDetails, scrapeYouTubeComments } from '../services/youtube.js';
import { extractTikTokVideoId, scrapeTikTokComments } from '../services/tiktok.js';

const router = express.Router();

const TOKEN_COST = TOKEN_COSTS.engagement_validation || 20;

/**
 * POST /api/engagement/estimate
 * Get token cost estimate
 */
router.post('/estimate', authenticate, async (req, res) => {
  try {
    const userBalance = req.profile?.token_balance || 0;

    res.json({
      token_cost: TOKEN_COST,
      user_balance: userBalance,
      can_afford: userBalance >= TOKEN_COST,
    });
  } catch (err) {
    console.error('Engagement estimate error:', err);
    res.status(500).json({ error: 'Failed to estimate token cost' });
  }
});

/**
 * GET /api/engagement/analyses
 * Get past comment analyses that can be used for engagement validation
 */
router.get('/analyses', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('analyses')
      .select('id, video_title, video_url, platform, comment_count, created_at')
      .eq('user_id', req.user.id)
      .in('analysis_type', ['youtube_comments', 'tiktok_comments'])
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({ analyses: data });
  } catch (err) {
    console.error('Fetch analyses error:', err);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

/**
 * POST /api/engagement/validate
 * Run engagement validation using URL or cached analysis
 */
router.post('/validate', authenticate, async (req, res) => {
  try {
    const { url, platform, analysisId } = req.body;

    if (!url && !analysisId) {
      return res.status(400).json({ error: 'Either URL or analysis ID is required' });
    }

    let videoData = null;
    let comments = [];
    let finalPlatform = platform?.toLowerCase();
    let videoUrl = url;

    // Option 1: Use cached analysis
    if (analysisId) {
      console.log(`[Engagement] Using cached analysis: ${analysisId}`);

      const { data: analysis, error: fetchError } = await supabaseAdmin
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .eq('user_id', req.user.id)
        .single();

      if (fetchError || !analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }

      if (analysis.status !== 'completed') {
        return res.status(400).json({ error: 'Analysis must be completed' });
      }

      finalPlatform = analysis.platform;
      videoUrl = analysis.video_url;

      // Extract video data from stored analysis
      videoData = {
        title: analysis.video_title,
        channelTitle: analysis.video_title?.split(' - ')?.[0] || 'Unknown',
        viewCount: analysis.sentiment_scores?.total || 0,
        likeCount: Math.round((analysis.sentiment_scores?.total || 0) * 0.04),
        commentCount: analysis.comment_count || 0,
      };

      // Use stored comments
      comments = analysis.raw_comments || [];

    // Option 2: Fetch fresh from URL
    } else if (url) {
      const validPlatforms = ['youtube', 'tiktok'];
      if (!validPlatforms.includes(finalPlatform)) {
        return res.status(400).json({ error: 'Platform must be youtube or tiktok' });
      }

      console.log(`[Engagement] Fetching fresh data from ${finalPlatform}: ${url}`);

      if (finalPlatform === 'youtube') {
        const videoId = extractVideoId(url);
        if (!videoId) {
          return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        videoData = await getVideoDetails(videoId);
        const result = await scrapeYouTubeComments(videoId, 500);
        comments = result.comments || [];

      } else if (finalPlatform === 'tiktok') {
        const videoId = await extractTikTokVideoId(url);
        if (!videoId) {
          return res.status(400).json({ error: 'Invalid TikTok URL' });
        }

        const result = await scrapeTikTokComments(videoId, 500);
        comments = result.comments || [];
        videoData = {
          title: 'TikTok Video',
          channelTitle: 'TikTok Creator',
          viewCount: result.videoData?.playCount || 0,
          likeCount: result.videoData?.diggCount || 0,
          commentCount: result.videoData?.commentCount || comments.length,
        };
      }
    }

    if (!videoData) {
      return res.status(400).json({ error: 'Could not fetch video data' });
    }

    // Check balance
    const userBalance = req.profile?.token_balance || 0;
    if (userBalance < TOKEN_COST) {
      return res.status(402).json({
        error: 'Insufficient tokens',
        required: TOKEN_COST,
        balance: userBalance,
      });
    }

    // Deduct tokens
    const { data: deductResult, error: deductError } = await supabaseAdmin.rpc('deduct_tokens', {
      p_user_id: req.user.id,
      p_amount: TOKEN_COST,
      p_description: `Engagement validation: ${videoData.title || finalPlatform}`,
      p_metadata: { platform: finalPlatform, url: videoUrl, analysisId: analysisId || null },
    });

    if (deductError || !deductResult?.[0]?.success) {
      return res.status(402).json({ error: deductResult?.[0]?.message || 'Failed to deduct tokens' });
    }

    // Run GPT-5.2 validation
    const startTime = Date.now();
    const result = await validateEngagement(videoData, comments, finalPlatform);
    const processingTime = Date.now() - startTime;

    // Store result
    const { data: validation, error: createError } = await supabaseAdmin
      .from('analyses')
      .insert({
        user_id: req.user.id,
        analysis_type: 'engagement_validation',
        platform: finalPlatform,
        video_url: videoUrl || null,
        video_title: videoData.title || `${finalPlatform} Engagement Validation`,
        tokens_used: TOKEN_COST,
        status: 'completed',
        summary: `Authenticity Score: ${result.authenticityScore}/100 - ${result.verdict}`,
        raw_comments: {
          type: 'engagement_validation',
          sourceAnalysisId: analysisId || null,
          result,
        },
        processing_time_ms: processingTime,
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to store validation:', createError);
    }

    res.json({
      validation_id: validation?.id || null,
      status: 'completed',
      tokens_used: TOKEN_COST,
      new_balance: deductResult[0].new_balance,
      processing_time_ms: processingTime,
      ...result,
    });

  } catch (err) {
    console.error('Engagement validation error:', err);
    res.status(500).json({ error: 'Validation failed: ' + err.message });
  }
});

/**
 * GET /api/engagement/history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('analyses')
      .select('id, video_title, platform, tokens_used, status, summary, created_at')
      .eq('user_id', req.user.id)
      .eq('analysis_type', 'engagement_validation')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      validations: data.map(item => ({
        id: item.id,
        videoTitle: item.video_title,
        platform: item.platform,
        tokensUsed: item.tokens_used,
        status: item.status,
        summary: item.summary,
        createdAt: item.created_at,
      })),
    });
  } catch (err) {
    console.error('Engagement history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/engagement/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const { data, error } = await supabaseAdmin
      .from('analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .eq('analysis_type', 'engagement_validation')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Validation not found' });
    }

    const storedData = data.raw_comments;
    if (!storedData?.result) {
      return res.status(404).json({ error: 'Validation data not found' });
    }

    res.json({
      validation_id: data.id,
      status: data.status,
      tokens_used: data.tokens_used,
      created_at: data.created_at,
      ...storedData.result,
    });
  } catch (err) {
    console.error('Get validation error:', err);
    res.status(500).json({ error: 'Failed to fetch validation' });
  }
});

export default router;
