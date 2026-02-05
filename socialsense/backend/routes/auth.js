import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

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
    const { limit = 50, offset = 0 } = req.query;
    
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

export default router;
