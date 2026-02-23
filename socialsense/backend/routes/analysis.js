import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import { authenticate } from '../middleware/auth.js';
import { validateUUID } from '../middleware/validation.js';
import { supabaseAdmin } from '../config/supabase.js';
import { TOKEN_COSTS } from '../config/stripe.js';

// Maximum comments to fetch (keeps processing fast and stable)
const MAX_COMMENTS = 100000;

// Rate limiter for file uploads (stricter than general API)
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 uploads per 15 minutes per user
  keyGenerator: (req) => req.user?.id || req.ip, // Rate limit by user ID if available
  message: { error: 'Too many uploads. Please try again later.' },
  skip: (req) => !req.files || Object.keys(req.files).length === 0, // Only apply when files are present
});

import { extractVideoId, getVideoDetails, scrapeYouTubeComments } from '../services/youtube.js';
import { extractTikTokVideoId, getTikTokCommentCount, scrapeTikTokComments } from '../services/tiktok.js';
import { processComments, extractThemesAndKeywords } from '../services/commentProcessor.js';
import { analyzeComments, transcribeAudio } from '../services/openai.js';
import { aggregateSentiment } from '../services/sentiment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

/**
 * Helper to safely delete temp files with proper logging
 */
async function safeUnlink(filePath, context = 'unknown') {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err) {
    // Only log if file exists but couldn't be deleted (not ENOENT)
    if (err.code !== 'ENOENT') {
      console.error(`[Cleanup] Failed to delete temp file (${context}): ${filePath}`, err.message);
    }
  }
}

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

    // Validate URL format and domain to prevent SSRF attacks
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Only allow https (and http for local dev)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed' });
    }

    // Validate domain matches platform
    const hostname = parsedUrl.hostname.toLowerCase();
    if (platform === 'youtube') {
      const validYouTubeDomains = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
      if (!validYouTubeDomains.includes(hostname)) {
        clearTimeout(timeout);
        return res.status(400).json({ error: 'URL must be from youtube.com or youtu.be' });
      }
    } else if (platform === 'tiktok') {
      const validTikTokDomains = ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'm.tiktok.com'];
      if (!validTikTokDomains.includes(hostname)) {
        clearTimeout(timeout);
        return res.status(400).json({ error: 'URL must be from tiktok.com' });
      }
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
        const countResult = await getTikTokCommentCount(videoId);
        commentCount = countResult.count;
        videoDetails = {
          id: videoId,
          title: 'TikTok Video',
          commentCount,
          commentCountEstimated: countResult.estimated
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

    // Cap comments at MAX_COMMENTS to keep processing stable
    const totalComments = commentCount;
    const cappedComments = Math.min(commentCount, MAX_COMMENTS);
    const isCapped = totalComments > MAX_COMMENTS;

    // Calculate token cost based on capped amount
    let tokenCost = 0;

    if (platform === 'youtube') {
      tokenCost += Math.max(1, Math.ceil(cappedComments / 1000) * TOKEN_COSTS.youtube_per_1000_comments);
    } else {
      tokenCost += Math.max(1, Math.ceil(cappedComments / 100) * TOKEN_COSTS.tiktok_per_100_comments);
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
      comment_count: cappedComments,
      total_comments: totalComments,
      is_capped: isCapped,
      max_comments: MAX_COMMENTS,
      token_cost: tokenCost,
      user_balance: userBalance,
      can_afford: userBalance >= tokenCost,
      has_video: !!has_video,
      breakdown: {
        scraping: platform === 'youtube'
          ? Math.max(1, Math.ceil(cappedComments / 1000) * TOKEN_COSTS.youtube_per_1000_comments)
          : Math.max(1, Math.ceil(cappedComments / 100) * TOKEN_COSTS.tiktok_per_100_comments),
        text_analysis: include_text_analysis ? TOKEN_COSTS.text_analysis : 0,
        marketing: include_marketing ? TOKEN_COSTS.marketing_analysis : 0,
        video: has_video ? TOKEN_COSTS.video_analysis : 0,
      },
    });
  } catch (error) {
    clearTimeout(timeout);
    console.error('Estimate error:', error);
    res.status(500).json({ error: 'Failed to estimate. Please try again.' });
  }
});

// In-memory progress tracking with TTL and max size
const PROGRESS_MAX_SIZE = 1000; // Maximum entries
const PROGRESS_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

class ProgressMap {
  constructor(maxSize = PROGRESS_MAX_SIZE, ttlMs = PROGRESS_TTL_MS) {
    this.map = new Map();
    this.timestamps = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  set(key, value) {
    // If at max size, remove oldest entry
    if (this.map.size >= this.maxSize && !this.map.has(key)) {
      const oldestKey = this.timestamps.entries().next().value?.[0];
      if (oldestKey) {
        this.map.delete(oldestKey);
        this.timestamps.delete(oldestKey);
      }
    }

    this.map.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp > this.ttlMs) {
      this.map.delete(key);
      this.timestamps.delete(key);
      return undefined;
    }
    return this.map.get(key);
  }

  delete(key) {
    this.map.delete(key);
    this.timestamps.delete(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > this.ttlMs) {
        this.map.delete(key);
        this.timestamps.delete(key);
      }
    }
  }

  get size() {
    return this.map.size;
  }
}

const progressMap = new ProgressMap();

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
router.post('/comments', authenticate, uploadFields, uploadRateLimiter, async (req, res) => {
  try {
    const {
      url,
      platform,
      max_comments = 1000,
      include_text_analysis = true,
      include_marketing = false,
      product_description,
      request_id,
      is_my_video = false,
      is_competitor = false,
      creator_notes = '',
      competitor_notes = '',
      harsh_feedback = false,
    } = req.body;

    // Convert string booleans to actual booleans
    const isMyVideo = is_my_video === 'true' || is_my_video === true;
    const isCompetitor = is_competitor === 'true' || is_competitor === true;
    const harshFeedback = harsh_feedback === 'true' || harsh_feedback === true;
    console.log('[Analysis] is_my_video raw:', is_my_video, 'converted:', isMyVideo);
    console.log('[Analysis] is_competitor raw:', is_competitor, 'converted:', isCompetitor);
    console.log('[Analysis] harsh_feedback raw:', harsh_feedback, 'converted:', harshFeedback);
    console.log('[Analysis] creator_notes:', creator_notes);
    console.log('[Analysis] competitor_notes:', competitor_notes);

    if (!url || !platform) {
      return res.status(400).json({ error: 'URL and platform are required' });
    }

    // Validate URL format and domain to prevent SSRF attacks
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed' });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (platform === 'youtube') {
      const validYouTubeDomains = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
      if (!validYouTubeDomains.includes(hostname)) {
        return res.status(400).json({ error: 'URL must be from youtube.com or youtu.be' });
      }
    } else if (platform === 'tiktok') {
      const validTikTokDomains = ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'm.tiktok.com'];
      if (!validTikTokDomains.includes(hostname)) {
        return res.status(400).json({ error: 'URL must be from tiktok.com' });
      }
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
        const countResult = await getTikTokCommentCount(videoId);
        videoDetails = {
          id: videoId,
          title: 'TikTok Video',
          commentCount: countResult.count,
          commentCountEstimated: countResult.estimated
        };
      } catch (e) {
        return res.status(400).json({ error: e.message || 'Failed to fetch TikTok video' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // 2. Calculate Costs (video is free) - cap at MAX_COMMENTS
    const commentsToFetch = Math.min(parseInt(max_comments) || 1000, videoDetails.commentCount || 1000, MAX_COMMENTS);
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
    if (videoFile) {
      tokenCost += TOKEN_COSTS.video_analysis;
      console.log(`[Analysis] Video file detected: ${videoFile.originalname} (${(videoFile.size / 1024 / 1024).toFixed(1)}MB) - adding ${TOKEN_COSTS.video_analysis} tokens`);
    }

    console.log(`[Analysis] Total token cost: ${tokenCost} (scraping: ${platform === 'youtube' ? Math.max(1, Math.ceil(commentsToFetch / 1000)) : Math.max(1, Math.ceil(commentsToFetch / 100))}, text: ${includeText ? TOKEN_COSTS.text_analysis : 0}, marketing: ${includeMkt ? TOKEN_COSTS.marketing_analysis : 0}, video: ${videoFile ? TOKEN_COSTS.video_analysis : 0})`);

    // 3. Check Balance & Deduct
    const { data: deductResult, error: deductError } = await supabaseAdmin.rpc('deduct_tokens', {
      p_user_id: req.user.id,
      p_amount: tokenCost,
      p_description: `${platform} analysis: ${videoDetails.title || videoId}`,
      p_metadata: { platform, url, has_video: !!videoFile }
    });

    if (deductError || !deductResult?.[0]?.success) {
      // Cleanup uploaded files
      if (productImageFile) await safeUnlink(productImageFile.path, 'productImage');
      if (videoFile) await safeUnlink(videoFile.path, 'videoFile');
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
        is_my_video: isMyVideo,
        is_competitor: isCompetitor,
        creator_notes: creator_notes || null,
        competitor_notes: competitor_notes || null,
      })
      .select()
      .single();

    if (createError) {
      if (productImageFile) await safeUnlink(productImageFile.path, 'productImage');
      if (videoFile) await safeUnlink(videoFile.path, 'videoFile');
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
      startTime: Date.now(),
      isMyVideo,
      isCompetitor,
      creatorNotes: creator_notes || null,
      competitorNotes: competitor_notes || null,
      harshFeedback,
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
    res.status(500).json({ error: 'Failed to start analysis. Please try again.' });
  }
});


/**
 * GET /api/analysis/history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { status, my_videos } = req.query;

    // Validate and sanitize pagination params
    const MAX_LIMIT = 100;
    const DEFAULT_LIMIT = 20;
    let limit = parseInt(req.query.limit) || DEFAULT_LIMIT;
    let offset = parseInt(req.query.offset) || 0;

    // Clamp values to safe ranges
    limit = Math.max(1, Math.min(limit, MAX_LIMIT));
    offset = Math.max(0, offset);

    let query = supabaseAdmin
      .from('analyses')
      .select('id, platform, video_title, analysis_type, comment_count, tokens_used, status, created_at, is_my_video, is_competitor, video_score, priority_improvement', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (my_videos === 'true') {
      query = query.eq('is_my_video', true);
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
 * GET /api/analysis/account-score
 * Get the user's account score (average of all "my video" scores)
 */
router.get('/account-score', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('analyses')
      .select('video_score')
      .eq('user_id', req.user.id)
      .eq('is_my_video', true)
      .eq('status', 'completed')
      .not('video_score', 'is', null);

    if (error) {
      console.error('Account score error:', error);
      return res.status(500).json({ error: 'Failed to calculate account score' });
    }

    const scores = data?.map(a => a.video_score) || [];
    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;

    res.json({
      score: avgScore ? Math.round(avgScore * 10) / 10 : null,
      videoCount: scores.length,
      hasScore: scores.length > 0,
      minScore: scores.length > 0 ? Math.min(...scores) : null,
      maxScore: scores.length > 0 ? Math.max(...scores) : null,
    });
  } catch (error) {
    console.error('Account score error:', error);
    res.status(500).json({ error: 'Failed to calculate account score' });
  }
});

/**
 * GET /api/analysis/score-history
 * Get score trend data for the user's "my video" analyses
 */
router.get('/score-history', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('analyses')
      .select('id, video_title, video_score, created_at')
      .eq('user_id', req.user.id)
      .eq('is_my_video', true)
      .eq('status', 'completed')
      .not('video_score', 'is', null)
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Score history error:', error);
      return res.status(500).json({ error: 'Failed to fetch score history' });
    }

    // Format for chart
    const history = (data || []).map(a => ({
      id: a.id,
      title: a.video_title || 'Untitled',
      score: a.video_score,
      date: a.created_at,
    }));

    res.json({ history });
  } catch (error) {
    console.error('Score history error:', error);
    res.status(500).json({ error: 'Failed to fetch score history' });
  }
});

/**
 * GET /api/analysis/:id
 */
router.get('/:id', authenticate, validateUUID('id'), async (req, res) => {
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
 * PATCH /api/analysis/:id/action-items
 * Update action item completion status
 */
router.patch('/:id/action-items', authenticate, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { actionItems } = req.body;

    if (!Array.isArray(actionItems)) {
      return res.status(400).json({ error: 'actionItems must be an array' });
    }

    // Verify ownership
    const { data: analysis, error: fetchError } = await supabaseAdmin
      .from('analyses')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Update action items
    const { error: updateError } = await supabaseAdmin
      .from('analyses')
      .update({ action_items: actionItems })
      .eq('id', id);

    if (updateError) {
      console.error('Action items update error:', updateError);
      return res.status(500).json({ error: 'Failed to update action items' });
    }

    res.json({ success: true, actionItems });
  } catch (error) {
    console.error('Action items update error:', error);
    res.status(500).json({ error: 'Failed to update action items' });
  }
});

/**
 * GET /api/analysis/:id/export
 */
router.get('/:id/export', authenticate, validateUUID('id'), async (req, res) => {
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
 * @param {string} videoPath - Path to video file
 * @param {number} framesPerSecond - Frames to extract per second
 * @param {number} timeoutMs - Timeout in milliseconds (default 5 minutes)
 */
async function extractVideoFrames(videoPath, framesPerSecond = 2, timeoutMs = 5 * 60 * 1000) {
  const tempDir = os.tmpdir();
  const framePrefix = `frame-${Date.now()}`;

  return new Promise((resolve, reject) => {
    const frames = [];
    const outputPattern = path.join(tempDir, `${framePrefix}-%03d.jpg`);
    let isResolved = false;

    // Extract 1 frame every N seconds, max 20 frames, good quality JPEG
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vf', `fps=1/${framesPerSecond},scale=512:-1`,  // Resize to 512px width for API limits
      '-frames:v', '20',
      '-q:v', '2',  // Higher quality (lower = better, 2-5 is good)
      '-y',  // Overwrite existing
      outputPattern,
    ]);

    // Set timeout
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        ffmpeg.kill('SIGKILL');
        console.error('[Video] FFmpeg timeout - process killed');
        reject(new Error('Video frame extraction timed out after 5 minutes'));
      }
    }, timeoutMs);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('error', (err) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeout);

      if (err.code === 'ENOENT') {
        console.error('[Video] FFmpeg not found');
        reject(new Error('ffmpeg not found. Please install ffmpeg to use video analysis features.'));
      } else {
        console.error('[Video] FFmpeg spawn error:', err);
        reject(err);
      }
    });

    ffmpeg.on('close', async (code) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeout);

      if (code !== 0) {
        console.error(`[Video] FFmpeg exited with code ${code}`);
        console.error('[Video] FFmpeg stderr:', stderr.slice(-500));
        reject(new Error('Failed to extract frames from video.'));
        return;
      }

      try {
        const files = await fs.readdir(tempDir);
        const frameFiles = files
          .filter(f => f.startsWith(framePrefix) && f.endsWith('.jpg'))
          .sort();

        console.log(`[Video] Found ${frameFiles.length} frame files`);

        for (const file of frameFiles.slice(0, 15)) {  // Limit to 15 frames
          const framePath = path.join(tempDir, file);
          const frameBuffer = await fs.readFile(framePath);

          // Only include frames larger than 1KB (valid images)
          if (frameBuffer.length > 1024) {
            frames.push(frameBuffer.toString('base64'));
          }
          await safeUnlink(framePath, 'videoFrame');
        }

        // Clean up any remaining frames
        for (const file of frameFiles.slice(15)) {
          const framePath = path.join(tempDir, file);
          await safeUnlink(framePath, 'videoFrame');
        }

        if (frames.length === 0) {
          reject(new Error('No valid frames extracted from video.'));
          return;
        }

        console.log(`[Video] Successfully extracted ${frames.length} frames`);
        resolve(frames);
      } catch (err) {
        console.error('[Video] Frame reading error:', err);
        reject(err);
      }
    });
  });
}

/**
 * Extract audio from video using FFmpeg (for Whisper transcription)
 * @param {string} videoPath - Path to video file
 * @param {number} timeoutMs - Timeout in milliseconds (default 5 minutes)
 */
async function extractAudio(videoPath, timeoutMs = 5 * 60 * 1000) {
  const outputPath = videoPath + '.audio.mp3';

  return new Promise((resolve, reject) => {
    let isResolved = false;

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

    // Set timeout
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        ffmpeg.kill('SIGKILL');
        console.error('[Audio] FFmpeg timeout - process killed');
        reject(new Error('Audio extraction timed out after 5 minutes'));
      }
    }, timeoutMs);

    ffmpeg.on('error', (err) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeout);

      if (err.code === 'ENOENT') {
        reject(new Error('ffmpeg not found'));
      } else {
        reject(err);
      }
    });

    ffmpeg.on('close', (code) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeout);

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
  includeText, includeMkt, product_description, productImagePath, videoFilePath, request_id, startTime,
  isMyVideo = false, isCompetitor = false, creatorNotes = null, competitorNotes = null, harshFeedback = false
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
        await safeUnlink(audioPath, 'audioFile');
        console.log(`[Video] Transcription complete: ${videoTranscript?.length || 0} chars`);
      } catch (audioErr) {
        console.warn('[Video] Audio transcription failed:', audioErr.message);
      }

      // Cleanup video file
      await safeUnlink(videoFilePath, 'videoFilePath');
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
        analysisResult = await analyzeComments(processedComments, platform, marketingContext, videoTranscript, videoFrames, isMyVideo, creatorNotes, isCompetitor, competitorNotes, harshFeedback);
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
      video_score: analysisResult.videoScore || null,
      priority_improvement: analysisResult.priorityImprovement || null,
      score_breakdown: analysisResult.scoreBreakdown || null,
      notes_assessment: analysisResult.notesAssessment || null,
      marketing_insights: analysisResult.marketingInsights || null,
      competitor_analysis: analysisResult.competitorAnalysis || null,
      action_items: analysisResult.actionItems || [],
    }).eq('id', analysisId);

    console.log('[Analysis] Final save - videoScore:', analysisResult.videoScore, 'scoreBreakdown:', analysisResult.scoreBreakdown ? 'found' : 'null', 'priorityImprovement:', analysisResult.priorityImprovement ? 'found' : 'null', 'actionItems:', analysisResult.actionItems?.length || 0);

    if (finalMetaError) {
      console.error('Final Save Meta Error:', finalMetaError);
      throw new Error('Failed to save analysis results: ' + finalMetaError.message);
    }

    // Cleanup
    if (productImagePath) await safeUnlink(productImagePath, 'productImagePath');
    if (request_id) setTimeout(() => progressMap.delete(request_id), 60000);

  } catch (error) {
    console.error('Job Error:', error);
    await supabaseAdmin.from('analyses').update({
      status: 'failed',
      error_message: error.message
    }).eq('id', analysisId);

    if (productImagePath) await safeUnlink(productImagePath, 'productImagePath');
    if (videoFilePath) await safeUnlink(videoFilePath, 'videoFilePath');
    if (request_id) setTimeout(() => progressMap.delete(request_id), 30000);
  }
}

/**
 * GET /api/analysis/compare/:id1/:id2
 * Compare two analyses side-by-side
 */
router.get('/compare/:id1/:id2', authenticate, validateUUID('id1'), validateUUID('id2'), async (req, res) => {
  try {
    const { id1, id2 } = req.params;

    // Fetch both analyses (must belong to user)
    const [result1, result2] = await Promise.all([
      supabaseAdmin
        .from('analyses')
        .select('*')
        .eq('id', id1)
        .eq('user_id', req.user.id)
        .single(),
      supabaseAdmin
        .from('analyses')
        .select('*')
        .eq('id', id2)
        .eq('user_id', req.user.id)
        .single(),
    ]);

    if (result1.error || !result1.data) {
      return res.status(404).json({ error: 'First analysis not found' });
    }
    if (result2.error || !result2.data) {
      return res.status(404).json({ error: 'Second analysis not found' });
    }

    const a = result1.data;
    const b = result2.data;

    // Calculate deltas
    const parseSentiment = (s) => {
      if (!s) return { positive: 0, neutral: 0, negative: 0 };
      if (typeof s === 'string') {
        try { return JSON.parse(s); } catch { return { positive: 0, neutral: 0, negative: 0 }; }
      }
      return s;
    };

    const sentA = parseSentiment(a.sentiment_scores);
    const sentB = parseSentiment(b.sentiment_scores);

    const parseArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return []; }
      }
      return [];
    };

    const kwA = parseArray(a.keywords).map(k => k?.word || k).filter(Boolean);
    const kwB = parseArray(b.keywords).map(k => k?.word || k).filter(Boolean);
    const sharedKeywords = kwA.filter(k => kwB.includes(k));
    const uniqueToA = kwA.filter(k => !kwB.includes(k));
    const uniqueToB = kwB.filter(k => !kwA.includes(k));

    res.json({
      analysis_a: a,
      analysis_b: b,
      comparison: {
        sentiment_delta: {
          positive: (sentA.positive || 0) - (sentB.positive || 0),
          neutral: (sentA.neutral || 0) - (sentB.neutral || 0),
          negative: (sentA.negative || 0) - (sentB.negative || 0),
        },
        score_delta: (a.video_score != null && b.video_score != null)
          ? a.video_score - b.video_score
          : null,
        comment_count_delta: (a.comment_count || 0) - (b.comment_count || 0),
        shared_keywords: sharedKeywords,
        unique_to_a: uniqueToA.slice(0, 10),
        unique_to_b: uniqueToB.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ error: 'Failed to compare analyses' });
  }
});

export default router;
