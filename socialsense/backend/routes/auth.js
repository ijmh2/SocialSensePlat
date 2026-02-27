import express from 'express';
import rateLimit from 'express-rate-limit';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Rate limiter for referral code checks - prevents brute-force enumeration
const referralCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 checks per 15 minutes per IP
  message: { error: 'Too many referral checks. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /api/auth/profile
 * Get current user's profile
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();
    
    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * PUT /api/auth/profile
 * Update current user's profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { full_name, avatar_url } = req.body;
    
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({ full_name, avatar_url })
      .eq('id', req.user.id)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: 'Failed to update profile' });
    }
    
    res.json({ profile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/auth/token-balance
 * Get current user's token balance
 */
router.get('/token-balance', authenticate, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('token_balance, total_tokens_purchased, total_analyses_run')
      .eq('id', req.user.id)
      .single();
    
    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json({
      token_balance: profile.token_balance,
      total_tokens_purchased: profile.total_tokens_purchased,
      total_analyses_run: profile.total_analyses_run,
    });
  } catch (error) {
    console.error('Get token balance error:', error);
    res.status(500).json({ error: 'Failed to get token balance' });
  }
});

/**
 * GET /api/auth/transactions
 * Get user's token transaction history
 */
router.get('/transactions', authenticate, async (req, res) => {
  try {
    // Validate and sanitize pagination params
    const MAX_LIMIT = 100;
    const DEFAULT_LIMIT = 50;
    let limit = parseInt(req.query.limit) || DEFAULT_LIMIT;
    let offset = parseInt(req.query.offset) || 0;

    // Clamp values to safe ranges
    limit = Math.max(1, Math.min(limit, MAX_LIMIT));
    offset = Math.max(0, offset);

    const { data: transactions, error, count } = await supabaseAdmin
      .from('token_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({ error: 'Failed to get transactions' });
    }

    res.json({ transactions, total: count });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

/**
 * GET /api/auth/referral
 * Get current user's referral info
 */
router.get('/referral', authenticate, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('referral_code, referral_count')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get total tokens earned from referrals
    const { data: bonuses } = await supabaseAdmin
      .from('referral_bonuses')
      .select('tokens_awarded')
      .eq('referrer_id', req.user.id);

    const totalEarned = (bonuses || []).reduce((sum, b) => sum + (b.tokens_awarded || 0), 0);

    res.json({
      referral_code: profile.referral_code,
      referral_count: profile.referral_count || 0,
      total_tokens_earned: totalEarned,
    });
  } catch (error) {
    console.error('Get referral info error:', error);
    res.status(500).json({ error: 'Failed to get referral info' });
  }
});

/**
 * POST /api/auth/apply-referral
 * Apply a referral code for the current user
 * Called after signup to credit both parties
 */
router.post('/apply-referral', authenticate, async (req, res) => {
  try {
    const { referral_code } = req.body;
    const REFERRAL_BONUS = 10; // Tokens awarded to each party

    if (!referral_code) {
      return res.status(400).json({ error: 'Referral code is required' });
    }

    // Check if user has already been referred
    const { data: existingReferral } = await supabaseAdmin
      .from('referral_bonuses')
      .select('id')
      .eq('referred_id', req.user.id)
      .single();

    if (existingReferral) {
      return res.status(400).json({ error: 'You have already used a referral code' });
    }

    // Find the referrer by code
    const { data: referrer, error: referrerError } = await supabaseAdmin
      .from('profiles')
      .select('id, referral_code, referral_count')
      .eq('referral_code', referral_code.toUpperCase())
      .single();

    if (referrerError || !referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // Can't refer yourself
    if (referrer.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    // Record the referral FIRST to prevent duplicate applications
    // This acts as the lock since referred_id has a unique constraint
    const { error: bonusError } = await supabaseAdmin
      .from('referral_bonuses')
      .insert({
        referrer_id: referrer.id,
        referred_id: req.user.id,
        tokens_awarded: REFERRAL_BONUS,
      });

    if (bonusError) {
      console.error('Failed to record referral bonus:', bonusError);
      // If this fails due to unique constraint, user was already referred
      if (bonusError.code === '23505') {
        return res.status(400).json({ error: 'You have already used a referral code' });
      }
      return res.status(500).json({ error: 'Failed to process referral' });
    }

    // Now award tokens - use Promise.allSettled to handle partial failures gracefully
    const tokenResults = await Promise.allSettled([
      supabaseAdmin.rpc('add_tokens', {
        p_user_id: referrer.id,
        p_amount: REFERRAL_BONUS,
        p_stripe_session_id: null,  // No Stripe session for referral bonus
        p_description: 'Referral bonus - new user signed up with your code',
      }),
      supabaseAdmin.rpc('add_tokens', {
        p_user_id: req.user.id,
        p_amount: REFERRAL_BONUS,
        p_stripe_session_id: null,  // No Stripe session for referral bonus
        p_description: `Referral bonus - signed up with code ${referral_code}`,
      }),
    ]);

    // Check for failures in token awards
    const referrerResult = tokenResults[0];
    const referredResult = tokenResults[1];

    if (referrerResult.status === 'rejected') {
      console.error('Failed to award referrer tokens (rejected):', referrerResult.reason);
    } else if (referrerResult.value?.error) {
      console.error('Failed to award referrer tokens:', referrerResult.value.error);
    }

    if (referredResult.status === 'rejected') {
      console.error('Failed to award referred user tokens (rejected):', referredResult.reason);
    } else if (referredResult.value?.error) {
      console.error('Failed to award referred user tokens:', referredResult.value.error);
    }

    // Update referrer's count and referred user's referred_by field in parallel
    // Use Promise.allSettled to prevent unhandled rejections
    const profileResults = await Promise.allSettled([
      supabaseAdmin
        .from('profiles')
        .update({ referral_count: (referrer.referral_count || 0) + 1 })
        .eq('id', referrer.id),
      supabaseAdmin
        .from('profiles')
        .update({ referred_by: referrer.id })
        .eq('id', req.user.id),
    ]);

    // Log any profile update failures
    profileResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Profile update ${index} failed:`, result.reason);
      } else if (result.value?.error) {
        console.error(`Profile update ${index} error:`, result.value.error);
      }
    });

    res.json({
      success: true,
      message: `Referral applied! You and your friend both received ${REFERRAL_BONUS} tokens.`,
      tokens_awarded: REFERRAL_BONUS,
    });
  } catch (error) {
    console.error('Apply referral error:', error);
    res.status(500).json({ error: 'Failed to apply referral' });
  }
});

/**
 * GET /api/auth/check-referral/:code
 * Check if a referral code is valid (public endpoint for signup form)
 * Security: Uses timing-safe response to prevent user enumeration
 */
router.get('/check-referral/:code', referralCheckLimiter, async (req, res) => {
  const startTime = Date.now();
  const MIN_RESPONSE_TIME = 100; // Minimum 100ms response to prevent timing attacks

  try {
    const { code } = req.params;

    // Validate code format (6 alphanumeric chars)
    if (!code || code.length !== 6 || !/^[A-Z0-9]+$/i.test(code)) {
      // Wait to prevent timing attack
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_RESPONSE_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_RESPONSE_TIME - elapsed));
      }
      return res.json({ valid: false });
    }

    const { data: referrer, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('referral_code', code.toUpperCase())
      .single();

    // Wait to normalize response time
    const elapsed = Date.now() - startTime;
    if (elapsed < MIN_RESPONSE_TIME) {
      await new Promise(resolve => setTimeout(resolve, MIN_RESPONSE_TIME - elapsed));
    }

    if (error || !referrer) {
      return res.json({ valid: false });
    }

    res.json({
      valid: true,
      referrer_name: referrer.full_name ? referrer.full_name.split(' ')[0] : 'A friend',
    });
  } catch (error) {
    console.error('Check referral error:', error);
    // Wait to normalize response time even on error
    const elapsed = Date.now() - startTime;
    if (elapsed < MIN_RESPONSE_TIME) {
      await new Promise(resolve => setTimeout(resolve, MIN_RESPONSE_TIME - elapsed));
    }
    res.json({ valid: false });
  }
});

export default router;
