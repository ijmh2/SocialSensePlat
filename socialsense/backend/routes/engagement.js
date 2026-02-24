import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { TOKEN_COSTS } from '../config/stripe.js';
import { validateEngagement } from '../services/engagementValidator.js';

const router = express.Router();

/**
 * POST /api/engagement/estimate
 * Get token cost estimate for engagement validation
 */
router.post('/estimate', authenticate, async (req, res) => {
  try {
    const { platform, contentMetricsCount = 0, commentSamplesCount = 0, includeHistoricalAnalysis = false } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    const validPlatforms = ['youtube', 'tiktok', 'instagram'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid platform. Must be youtube, tiktok, or instagram' });
    }

    // Calculate token cost
    let tokenCost = TOKEN_COSTS.engagement_validation_base || 8;

    // Add cost for comment analysis
    if (commentSamplesCount > 0) {
      const commentBatches = Math.ceil(commentSamplesCount / 100);
      tokenCost += commentBatches * (TOKEN_COSTS.engagement_comments_per_100 || 2);
    }

    // Add cost for historical analysis
    if (includeHistoricalAnalysis) {
      tokenCost += TOKEN_COSTS.engagement_historical_analysis || 5;
    }

    const userBalance = req.profile?.token_balance || 0;

    res.json({
      token_cost: tokenCost,
      breakdown: {
        base: TOKEN_COSTS.engagement_validation_base || 8,
        comments: commentSamplesCount > 0 ? Math.ceil(commentSamplesCount / 100) * (TOKEN_COSTS.engagement_comments_per_100 || 2) : 0,
        historical: includeHistoricalAnalysis ? (TOKEN_COSTS.engagement_historical_analysis || 5) : 0,
      },
      user_balance: userBalance,
      can_afford: userBalance >= tokenCost,
    });
  } catch (err) {
    console.error('Engagement estimate error:', err);
    res.status(500).json({ error: 'Failed to estimate token cost' });
  }
});

/**
 * POST /api/engagement/validate
 * Run full engagement validation
 */
router.post('/validate', authenticate, async (req, res) => {
  try {
    const {
      platform,
      profileMetrics,
      contentMetrics,
      commentSamples,
      historicalData,
      influencerName,
    } = req.body;

    // Validation
    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    const validPlatforms = ['youtube', 'tiktok', 'instagram'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid platform. Must be youtube, tiktok, or instagram' });
    }

    if (!profileMetrics || typeof profileMetrics.followers !== 'number') {
      return res.status(400).json({ error: 'Profile metrics with follower count is required' });
    }

    if (!contentMetrics || !Array.isArray(contentMetrics) || contentMetrics.length === 0) {
      return res.status(400).json({ error: 'At least one content metric entry is required' });
    }

    // Validate content metrics structure
    for (let i = 0; i < contentMetrics.length; i++) {
      const metric = contentMetrics[i];
      if (typeof metric.likes !== 'number' && typeof metric.views !== 'number') {
        return res.status(400).json({ error: `Content metric at index ${i} must have likes or views` });
      }
    }

    // Calculate token cost
    const commentSamplesCount = commentSamples?.length || 0;
    const includeHistoricalAnalysis = !!(historicalData?.followerHistory?.length);

    let tokenCost = TOKEN_COSTS.engagement_validation_base || 8;

    if (commentSamplesCount > 0) {
      const commentBatches = Math.ceil(commentSamplesCount / 100);
      tokenCost += commentBatches * (TOKEN_COSTS.engagement_comments_per_100 || 2);
    }

    if (includeHistoricalAnalysis) {
      tokenCost += TOKEN_COSTS.engagement_historical_analysis || 5;
    }

    // Check balance
    const userBalance = req.profile?.token_balance || 0;
    if (userBalance < tokenCost) {
      return res.status(402).json({
        error: 'Insufficient tokens',
        required: tokenCost,
        balance: userBalance,
      });
    }

    // Deduct tokens
    const { data: deductResult, error: deductError } = await supabaseAdmin.rpc('deduct_tokens', {
      p_user_id: req.user.id,
      p_amount: tokenCost,
      p_description: `Engagement validation: ${influencerName || platform}`,
      p_metadata: { platform, influencer_name: influencerName || null },
    });

    if (deductError || !deductResult?.[0]?.success) {
      return res.status(402).json({
        error: deductResult?.[0]?.message || 'Failed to deduct tokens',
      });
    }

    // Run validation
    const startTime = Date.now();
    const result = validateEngagement({
      platform: platform.toLowerCase(),
      profileMetrics,
      contentMetrics,
      commentSamples: commentSamples || [],
      historicalData: historicalData || null,
      influencerName,
    });

    const processingTime = Date.now() - startTime;

    // Store result in analyses table with engagement_validation type
    const { data: analysis, error: createError } = await supabaseAdmin
      .from('analyses')
      .insert({
        user_id: req.user.id,
        analysis_type: 'engagement_validation',
        platform: platform.toLowerCase(),
        video_title: influencerName || `${platform} Engagement Validation`,
        tokens_used: tokenCost,
        status: 'completed',
        summary: `Authenticity Score: ${result.authenticityScore}/100 - ${result.verdict}`,
        raw_comments: {
          type: 'engagement_validation',
          input: { profileMetrics, contentMetrics, commentSamplesCount, hasHistoricalData: includeHistoricalAnalysis },
          result,
        },
        processing_time_ms: processingTime,
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to store engagement validation:', createError);
      // Still return result even if storage fails
    }

    res.json({
      validation_id: analysis?.id || null,
      status: 'completed',
      tokens_used: tokenCost,
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
 * Get past engagement validations
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

    if (error) {
      throw error;
    }

    // Transform for frontend
    const validations = data.map(item => ({
      id: item.id,
      influencerName: item.video_title,
      platform: item.platform,
      tokensUsed: item.tokens_used,
      status: item.status,
      summary: item.summary,
      createdAt: item.created_at,
    }));

    res.json({ validations });
  } catch (err) {
    console.error('Engagement history error:', err);
    res.status(500).json({ error: 'Failed to fetch validation history' });
  }
});

/**
 * GET /api/engagement/:id
 * Get specific engagement validation result
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid validation ID format' });
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

    // Extract the stored result
    const storedData = data.raw_comments;

    if (!storedData || storedData.type !== 'engagement_validation') {
      return res.status(404).json({ error: 'Validation data not found' });
    }

    res.json({
      validation_id: data.id,
      status: data.status,
      tokens_used: data.tokens_used,
      created_at: data.created_at,
      processing_time_ms: data.processing_time_ms,
      ...storedData.result,
    });
  } catch (err) {
    console.error('Get engagement validation error:', err);
    res.status(500).json({ error: 'Failed to fetch validation' });
  }
});

export default router;
