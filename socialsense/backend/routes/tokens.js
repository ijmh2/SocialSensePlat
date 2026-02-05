import express from 'express';
import stripe, { TOKEN_PACKAGES, TOKEN_COSTS } from '../config/stripe.js';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/tokens/packages
 * Get available token packages
 */
router.get('/packages', (req, res) => {
  res.json({ packages: TOKEN_PACKAGES });
});

/**
 * GET /api/tokens/costs
 * Get token costs for different actions
 */
router.get('/costs', (req, res) => {
  res.json({ costs: TOKEN_COSTS });
});

/**
 * POST /api/tokens/calculate
 * Calculate token cost for an analysis
 */
router.post('/calculate', authenticate, async (req, res) => {
  try {
    const { platform, comment_count, include_text_analysis, include_marketing } = req.body;
    
    let tokenCost = 0;
    
    if (platform === 'youtube') {
      tokenCost += Math.ceil(comment_count / 1000) * TOKEN_COSTS.youtube_per_1000_comments;
    } else if (platform === 'tiktok') {
      tokenCost += Math.ceil(comment_count / 100) * TOKEN_COSTS.tiktok_per_100_comments;
    }
    
    if (include_text_analysis) {
      tokenCost += TOKEN_COSTS.text_analysis;
    }
    
    if (include_marketing) {
      tokenCost += TOKEN_COSTS.marketing_analysis;
    }
    
    // Minimum 1 token
    tokenCost = Math.max(1, tokenCost);
    
    const userBalance = req.profile?.token_balance || 0;
    const canAfford = userBalance >= tokenCost;
    
    res.json({
      token_cost: tokenCost,
      user_balance: userBalance,
      can_afford: canAfford,
      breakdown: {
        scraping: platform === 'youtube' 
          ? Math.ceil(comment_count / 1000) * TOKEN_COSTS.youtube_per_1000_comments
          : Math.ceil(comment_count / 100) * TOKEN_COSTS.tiktok_per_100_comments,
        text_analysis: include_text_analysis ? TOKEN_COSTS.text_analysis : 0,
        marketing: include_marketing ? TOKEN_COSTS.marketing_analysis : 0,
      },
    });
  } catch (error) {
    console.error('Calculate tokens error:', error);
    res.status(500).json({ error: 'Failed to calculate token cost' });
  }
});

/**
 * POST /api/tokens/checkout
 * Create a Stripe checkout session for purchasing tokens
 */
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { package_id } = req.body;
    
    // Find the package
    const tokenPackage = TOKEN_PACKAGES.find(p => p.id === package_id);
    if (!tokenPackage) {
      return res.status(400).json({ error: 'Invalid package' });
    }
    
    // Get or create Stripe customer
    let { data: stripeCustomer } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', req.user.id)
      .single();
    
    let customerId;
    
    if (!stripeCustomer) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          supabase_user_id: req.user.id,
        },
      });
      
      // Save to database
      await supabaseAdmin.from('stripe_customers').insert({
        user_id: req.user.id,
        stripe_customer_id: customer.id,
      });
      
      customerId = customer.id;
    } else {
      customerId = stripeCustomer.stripe_customer_id;
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: tokenPackage.name,
              description: tokenPackage.description,
            },
            unit_amount: tokenPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/tokens/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/tokens`,
      metadata: {
        user_id: req.user.id,
        package_id: tokenPackage.id,
        tokens: tokenPackage.tokens.toString(),
      },
    });
    
    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * GET /api/tokens/verify-session/:sessionId
 * Verify a completed checkout session
 */
router.get('/verify-session/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log('Verifying session:', sessionId);
    
    // Retrieve session from Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (stripeError) {
      console.error('Stripe retrieve error:', stripeError);
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    
    console.log('Session status:', session.payment_status);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        error: 'Payment not completed yet',
        status: session.payment_status 
      });
    }
    
    // Check if already processed
    const { data: existingTransaction } = await supabaseAdmin
      .from('token_transactions')
      .select('id, balance_after')
      .eq('stripe_session_id', sessionId)
      .single();
    
    if (existingTransaction) {
      console.log('Already processed, returning existing data');
      return res.json({
        success: true,
        tokens_added: parseInt(session.metadata?.tokens || 0),
        new_balance: existingTransaction.balance_after,
        already_processed: true,
      });
    }
    
    const tokensToAdd = parseInt(session.metadata?.tokens || 0);
    const userId = session.metadata?.user_id || req.user.id;
    
    if (!tokensToAdd) {
      return res.status(400).json({ error: 'Invalid token amount in session' });
    }
    
    // Try using the database function first
    try {
      const { data, error } = await supabaseAdmin.rpc('add_tokens', {
        p_user_id: userId,
        p_amount: tokensToAdd,
        p_stripe_session_id: sessionId,
        p_description: `Purchased ${tokensToAdd} tokens`,
      });
      
      if (!error && data && data[0]?.success) {
        console.log('Tokens added via RPC:', data[0]);
        return res.json({
          success: true,
          tokens_added: tokensToAdd,
          new_balance: data[0].new_balance,
        });
      }
      
      console.warn('RPC failed, falling back to manual update:', error);
    } catch (rpcError) {
      console.warn('RPC not available, using fallback:', rpcError.message);
    }
    
    // Fallback: Manual token addition if RPC fails
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('token_balance, total_tokens_purchased')
      .eq('id', userId)
      .single();
    
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const newBalance = (profile.token_balance || 0) + tokensToAdd;
    
    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        token_balance: newBalance,
        total_tokens_purchased: (profile.total_tokens_purchased || 0) + tokensToAdd 
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Profile update error:', updateError);
      return res.status(500).json({ error: 'Failed to update token balance' });
    }
    
    // Record transaction
    await supabaseAdmin.from('token_transactions').insert({
      user_id: userId,
      transaction_type: 'purchase',
      amount: tokensToAdd,
      balance_after: newBalance,
      stripe_session_id: sessionId,
      description: `Purchased ${tokensToAdd} tokens`,
    });
    
    console.log('Tokens added via fallback, new balance:', newBalance);
    
    res.json({
      success: true,
      tokens_added: tokensToAdd,
      new_balance: newBalance,
    });
  } catch (error) {
    console.error('Verify session error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify session' });
  }
});

export default router;
