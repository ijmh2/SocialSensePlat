import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import { authenticate } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { TOKEN_COSTS } from '../config/stripe.js';

import { extractVideoId, getVideoDetails, scrapeYouTubeComments } from '../services/youtube.js';
import { extractTikTokVideoId, getTikTokCommentCount, scrapeTikTokComments } from '../services/tiktok.js';
import { processComments, extractThemesAndKeywords } from '../services/commentProcessor.js';
import { analyzeComments, transcribeAudio } from '../services/openai.js';
import { aggregateSentiment } from '../services/sentiment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Configure multer for uploads (product_image and video)
const upload = multer({
  dest: path.join(os.tmpdir(), 'socialsense-uploads'),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and image files are allowed'));
    }
  },
});

// Multer fields config for unified analysis
const uploadFields = upload.fields([
  { name: 'product_image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
]);

/**
 * POST /api/analysis/estimate
 * Get comment count and cost estimate for a video
 */
router.post('/estimate', authenticate, async (req, res) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout. Please try again.' });
    }
  }, 30000); // 30 second timeout

  try {
    const { url, platform, include_text_analysis = true, include_marketing = false, has_video = false } = req.body;

    if (!url || !platform) {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'URL and platform are required' });
    }

    let videoDetails = null;
    let commentCount = 0;

    if (platform === 'youtube') {
      const videoId = extractVideoId(url);
      if (!videoId) {
        clearTimeout(timeout);
        return res.status(400).json({ error: 'Invalid YouTube URL. Could not extract video ID.' });
      }

      try {
        videoDetails = await getVideoDetails(videoId);
        commentCount = videoDetails.commentCount;
      } catch (ytError) {
        clearTimeout(timeout);
        console.error('YouTube API error:', ytError);
        return res.status(400).json({
          error: ytError.message || 'Failed to fetch YouTube video details. Check your API key.',
          details: 'Make sure your YouTube API key is valid and has quota remaining.'
        });
      }
    } else if (platform === 'tiktok') {
      try {
        const videoId = await extractTikTokVideoId(url);
        commentCount = await getTikTokCommentCount(videoId);
        videoDetails = {
          id: videoId,
          title: 'TikTok Video',
          commentCount
        };
      } catch (ttError) {
        clearTimeout(timeout);
        console.error('TikTok error:', ttError);
        return res.status(400).json({
          error: ttError.message || 'Failed to fetch TikTok video details.',
          details: 'TikTok URLs can be tricky. Make sure to use the full video URL.'
        });
      }
    } else {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'Invalid platform. Use "youtube" or "tiktok".' });
    }

    // Calculate token cost
    let tokenCost = 0;

    if (platform === 'youtube') {
      tokenCost += Math.max(1, Math.ceil(commentCount / 1000) * TOKEN_COSTS.youtube_per_1000_comments);
    } else {
      tokenCost += Math.max(1, Math.ceil(commentCount / 100) * TOKEN_COSTS.tiktok_per_100_comments);
    }

    if (include_text_analysis) {
      tokenCost += TOKEN_COSTS.text_analysis;
    }

    if (include_marketing) {
      tokenCost += TOKEN_COSTS.marketing_analysis;
    }

    // Video upload costs 20 tokens (Whisper + GPT-4o vision)
    if (has_video) {
      tokenCost += TOKEN_COSTS.video_analysis;
    }

    tokenCost = Math.max(1, tokenCost);

    const userBalance = req.profile?.token_balance || 0;

    clearTimeout(timeout);
    res.json({
      video: videoDetails,
      comment_count: commentCount,
      token_cost: tokenCost,
      user_balance: userBalance,
      can_afford: userBalance >= tokenCost,
      has_video: !!has_video,
      breakdown: {
        scraping: platform === 'youtube'
          ? Math.max(1, Math.ceil(commentCount / 1000) * TOKEN_COSTS.youtube_per_1000_comments)
          : Math.max(1, Math.ceil(commentCount / 100) * TOKEN_COSTS.tiktok_per_100_comments),
        text_analysis: include_text_analysis ? TOKEN_COSTS.text_analysis : 0,
        marketing: include_marketing ? TOKEN_COSTS.marketing_analysis : 0,
        video: has_video ? TOKEN_COSTS.video_analysis : 0,
      },
    });
  } catch (error) {
    clearTimeout(timeout);
    console.error('Estimate error:', error);
    res.status(500).json({ error: error.message || 'Failed to estimate. Please try again.' });
  }
});

// In-memory progress tracking
const progressMap = new Map();

/**
 * GET /api/analysis/progress/:requestId
 * Check analysis progress
 */
router.get('/progress/:requestId', (req, res) => {
  const { requestId } = req.params;
  const progress = progressMap.get(requestId) || { stage: 'init', count: 0, percent: 0 };
  res.json(progress);
});

// POST /api/analysis/comments
// Unified analysis: comments + optional video upload
router.post('/comments', authenticate, uploadFields, async (req, res) => {
  try {
    const {
      url,
      platform,
      max_comments = 1000,
      include_text_analysis = true,
      include_marketing = false,
      product_description,
      request_id,
    } = req.body;

    if (!url || !platform) {
      return res.status(400).json({ error: 'URL and platform are required' });
    }

    // Extract files from multer
    const productImageFile = req.files?.product_image?.[0];
    const videoFile = req.files?.video?.[0];

    if (request_id) {
      progressMap.set(request_id, { stage: 'init', count: 0, percent: 5 });
    }

    // 1. Fetch Video Details (Fast)
    let videoId, videoDetails;

    if (platform === 'youtube') {
      videoId = extractVideoId(url);
      if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });
      try {
        videoDetails = await getVideoDetails(videoId);
      } catch (e) {
        return res.status(400).json({ error: e.message || 'Failed to fetch YouTube video' });
      }
    } else if (platform === 'tiktok') {
      try {
        videoId = await extractTikTokVideoId(url);
        const count = await getTikTokCommentCount(videoId);
        videoDetails = { id: videoId, title: 'TikTok Video', commentCount: count };
      } catch (e) {
        return res.status(400).json({ error: e.message || 'Failed to fetch TikTok video' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // 2. Calculate Costs (video is free)
    const commentsToFetch = Math.min(parseInt(max_comments) || 1000, videoDetails.commentCount || 1000);
    let tokenCost = 0;
    if (platform === 'youtube') {
      tokenCost += Math.max(1, Math.ceil(commentsToFetch / 1000) * TOKEN_COSTS.youtube_per_1000_comments);
    } else {
      tokenCost += Math.max(1, Math.ceil(commentsToFetch / 100) * TOKEN_COSTS.tiktok_per_100_comments);
    }

    const includeText = include_text_analysis === 'true' || include_text_analysis === true;
    const includeMkt = include_marketing === 'true' || include_marketing === true;
    if (includeText) tokenCost += TOKEN_COSTS.text_analysis;
    if (includeMkt) tokenCost += TOKEN_COSTS.marketing_analysis;

    // Video upload costs 20 tokens (Whisper + GPT-4o vision)
    if (videoFile) tokenCost += TOKEN_COSTS.video_analysis;

    // 3. Check Balance & Deduct
    const { data: deductResult, error: deductError } = await supabaseAdmin.rpc('deduct_tokens', {
      p_user_id: req.user.id,
      p_amount: tokenCost,
      p_description: `${platform} analysis: ${videoDetails.title || videoId}`,
      p_metadata: { platform, url, has_video: !!videoFile }
    });

    if (deductError || !deductResult?.[0]?.success) {
      // Cleanup uploaded files
      if (productImageFile) await fs.unlink(productImageFile.path).catch(() => {});
      if (videoFile) await fs.unlink(videoFile.path).catch(() => {});
      return res.status(402).json({ error: deductResult?.[0]?.message || 'Insufficient tokens' });
    }

    // 4. Create Record
    const { data: analysis, error: createError } = await supabaseAdmin
      .from('analyses')
      .insert({
        user_id: req.user.id,
        analysis_type: `${platform}_comments`,
        platform,
        video_url: url,
        video_title: videoDetails.title,
        tokens_used: tokenCost,
        status: 'processing',
        has_video: !!videoFile,
      })
      .select()
      .single();

    if (createError) {
      if (productImageFile) await fs.unlink(productImageFile.path).catch(() => {});
      if (videoFile) await fs.unlink(videoFile.path).catch(() => {});
      return res.status(500).json({ error: 'Failed to create analysis record' });
    }

    // 5. Start Background Job
    processAnalysisJob({
      analysisId: analysis.id,
      videoId,
      platform,
      commentsToFetch,
      includeText,
      includeMkt,
      product_description,
      productImagePath: productImageFile?.path,
      videoFilePath: videoFile?.path,
      request_id,
      startTime: Date.now()
    }).catch(err => console.error('Background Job Failed:', err));

    // 6. Return Immediately
    res.json({
      analysis_id: analysis.id,
      message: 'Analysis started',
      status: 'processing',
      has_video: !!videoFile,
    });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message });
  }
});


/**
 * GET /api/analysis/history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;

    let query = supabaseAdmin
      .from('analyses')
      .select('id, platform, video_title, analysis_type, comment_count, tokens_used, status, created_at', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: analyses, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: 'Failed to fetch history' });
    }

    res.json({ analyses: analyses || [], total: count || 0 });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/analysis/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: analysis, error } = await supabaseAdmin
      .from('analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({ analysis });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

/**
 * GET /api/analysis/:id/export
 */
router.get('/:id/export', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: analysis, error } = await supabaseAdmin
      .from('analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const comments = analysis.raw_comments || [];

    const headers = ['user', 'text', 'likes'];
    const rows = comments.map(c => [
      `"${(c.user || '').replace(/"/g, '""')}"`,
      `"${(c.text || '').replace(/"/g, '""')}"`,
      c.likes || 0,
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analysis-${id}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export analysis' });
  }
});

/**
 * Extract frames from video using FFmpeg
 */
async function extractVideoFrames(videoPath, framesPerSecond = 1) {
  const tempDir = os.tmpdir();
  const framePrefix = `frame-${Date.now()}`;

  return new Promise((resolve, reject) => {
    const frames = [];
    const outputPattern = path.join(tempDir, `${framePrefix}-%03d.jpg`);

    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vf', `fps=1/${framesPerSecond}`,
      '-frames:v', '30',
      '-q:v', '5',
      outputPattern,
    ]);

    ffmpeg.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('ffmpeg not found. Please install ffmpeg to use video analysis features.'));
      } else {
        reject(err);
      }
    });

    ffmpeg.on('close', async (code) => {
      if (code !== 0) {
        try {
          const imageBuffer = await fs.readFile(videoPath);
          resolve([imageBuffer.toString('base64')]);
          return;
        } catch {
          reject(new Error('Failed to process video with ffmpeg.'));
          return;
        }
      }

      try {
        const files = await fs.readdir(tempDir);
        const frameFiles = files
          .filter(f => f.startsWith(framePrefix) && f.endsWith('.jpg'))
          .sort();

        for (const file of frameFiles.slice(0, 20)) {
          const framePath = path.join(tempDir, file);
          const frameBuffer = await fs.readFile(framePath);
          frames.push(frameBuffer.toString('base64'));
          await fs.unlink(framePath).catch(() => {});
        }

        if (frames.length === 0) {
          reject(new Error('No frames extracted from video.'));
          return;
        }

        resolve(frames);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Extract audio from video using FFmpeg (for Whisper transcription)
 */
async function extractAudio(videoPath) {
  const outputPath = videoPath + '.audio.mp3';

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vn',                    // No video
      '-acodec', 'libmp3lame',  // MP3 encoding
      '-ab', '128k',            // 128kbps bitrate
      '-ar', '16000',           // 16kHz sample rate (optimal for Whisper)
      '-ac', '1',               // Mono
      '-y',                     // Overwrite output
      outputPath,
    ]);

    ffmpeg.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('ffmpeg not found'));
      } else {
        reject(err);
      }
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Audio extraction failed'));
      } else {
        resolve(outputPath);
      }
    });
  });
}

// Background Worker Function (Unified: comments + optional video)
async function processAnalysisJob({
  analysisId, videoId, platform, commentsToFetch,
  includeText, includeMkt, product_description, productImagePath, videoFilePath, request_id, startTime
}) {
  try {
    // 1. Scrape Comments
    let rawComments = [];
    if (request_id) progressMap.set(request_id, { stage: 'scraping', count: 0, percent: 10 });

    try {
      if (platform === 'youtube') {
        rawComments = await scrapeYouTubeComments(videoId, commentsToFetch, (count) => {
          if (request_id) {
            const p = Math.min(70, 10 + Math.floor((count / commentsToFetch) * 60));
            progressMap.set(request_id, { stage: 'scraping', count, percent: p });
          }
        });
      } else {
        if (request_id) progressMap.set(request_id, { stage: 'scraping', count: 0, percent: 30 });
        rawComments = await scrapeTikTokComments(videoId, commentsToFetch);
      }
    } catch (e) {
      throw new Error(`Scraping failed: ${e.message}`);
    }

    if (!rawComments || !rawComments.length) throw new Error('No comments found');

    // 2. Process Comments (includes sentiment scoring)
    if (request_id) progressMap.set(request_id, { stage: 'processing', count: rawComments.length, percent: 72 });
    const { comments: processedComments, stats: filterStats } = processComments(rawComments);

    // 3. Aggregate Sentiment
    if (request_id) progressMap.set(request_id, { stage: 'analyzing_sentiment', count: rawComments.length, percent: 75 });
    const sentimentResults = processedComments.map(c => c.sentiment).filter(Boolean);
    const sentimentScores = aggregateSentiment(sentimentResults);

    // 4. Safety Save (metadata, filter stats, sentiment, raw comments)
    const { error: metaError } = await supabaseAdmin.from('analyses').update({
      filter_stats: filterStats,
      sentiment_scores: sentimentScores,
      comment_count: rawComments.length,
      status: 'processing'
    }).eq('id', analysisId);
    if (metaError) console.error('Safety Save Meta Error:', metaError);

    const { error: commentsError } = await supabaseAdmin.from('analyses').update({
      raw_comments: processedComments
    }).eq('id', analysisId);
    if (commentsError) console.error('Safety Save Comments Error:', commentsError);

    // 5. Video Processing (if video file provided)
    let videoFrames = null;
    let videoTranscript = null;

    if (videoFilePath) {
      // 5a. Extract frames
      if (request_id) progressMap.set(request_id, { stage: 'extracting_video', count: rawComments.length, percent: 78 });
      try {
        videoFrames = await extractVideoFrames(videoFilePath);
        console.log(`[Video] Extracted ${videoFrames?.length || 0} frames`);
      } catch (frameErr) {
        console.warn('[Video] Frame extraction failed:', frameErr.message);
      }

      // 5b. Extract audio and transcribe
      if (request_id) progressMap.set(request_id, { stage: 'transcribing_audio', count: rawComments.length, percent: 82 });
      try {
        const audioPath = await extractAudio(videoFilePath);
        console.log('[Video] Audio extracted, transcribing...');
        videoTranscript = await transcribeAudio(audioPath);
        await fs.unlink(audioPath).catch(() => {});
        console.log(`[Video] Transcription complete: ${videoTranscript?.length || 0} chars`);
      } catch (audioErr) {
        console.warn('[Video] Audio transcription failed:', audioErr.message);
      }

      // Cleanup video file
      await fs.unlink(videoFilePath).catch(() => {});
    }

    // 6. Prepare Marketing Context
    let marketingContext = null;
    if (includeMkt && product_description) {
      marketingContext = { description: product_description, image_base64: null };
      if (productImagePath) {
        try {
          const buff = await fs.readFile(productImagePath);
          marketingContext.image_base64 = buff.toString('base64');
        } catch (e) { console.warn('Image read fail', e); }
      }
    }

    // 7. AI Analysis (includes video transcript + frames if available)
    let analysisResult = { summary: null, keywords: [], themes: [], stats: null };
    if (includeText) {
      if (request_id) progressMap.set(request_id, { stage: 'analyzing_ai', count: rawComments.length, percent: 88 });

      try {
        analysisResult = await analyzeComments(processedComments, platform, marketingContext, videoTranscript, videoFrames);
      } catch (aiErr) {
        console.error('AI Error:', aiErr);
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

    // 8. Final Update
    const { error: finalMetaError } = await supabaseAdmin.from('analyses').update({
      status: 'completed',
      summary: analysisResult.summary,
      keywords: analysisResult.keywords,
      themes: analysisResult.themes,
      video_transcript: videoTranscript || null,
      processing_time_ms: processingTime,
    }).eq('id', analysisId);

    if (finalMetaError) {
      console.error('Final Save Meta Error:', finalMetaError);
      throw new Error('Failed to save analysis results: ' + finalMetaError.message);
    }

    // Cleanup
    if (productImagePath) await fs.unlink(productImagePath).catch(() => {});
    if (request_id) setTimeout(() => progressMap.delete(request_id), 60000);

  } catch (error) {
    console.error('Job Error:', error);
    await supabaseAdmin.from('analyses').update({
      status: 'failed',
      error_message: error.message
    }).eq('id', analysisId);

    if (productImagePath) await fs.unlink(productImagePath).catch(() => {});
    if (videoFilePath) await fs.unlink(videoFilePath).catch(() => {});
    if (request_id) setTimeout(() => progressMap.delete(request_id), 30000);
  }
}

export default router;
