import express from 'express';
import rateLimit from 'express-rate-limit';
import stripe, { TOKEN_PACKAGES, TOKEN_COSTS, SUBSCRIPTION_PLANS } from '../config/stripe.js';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import logger from '../utils/logger.js';

// Stricter rate limiting for checkout endpoint
const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 checkout attempts per hour
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many checkout attempts. Please try again later.' },
});

const router = express.Router();

/**
 * GET /api/tokens/packages
 * Get available token packages
 */
router.get('/packages', (req, res) => {
  res.json({ packages: TOKEN_PACKAGES });
});

/**
 * GET /api/tokens/subscriptions
 * Get available subscription plans
 */
router.get('/subscriptions', (req, res) => {
  res.json({ plans: SUBSCRIPTION_PLANS });
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
    logger.error('Calculate tokens error', error);
    res.status(500).json({ error: 'Failed to calculate token cost' });
  }
});

/**
 * POST /api/tokens/checkout
 * Create a Stripe checkout session for purchasing tokens
 */
router.post('/checkout', authenticate, checkoutLimiter, async (req, res) => {
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
    logger.error('Checkout error', error);
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
    
    logger.debug('Verifying session', { sessionId });
    
    // Retrieve session from Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (stripeError) {
      logger.error('Stripe retrieve error', stripeError);
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    
    logger.debug('Session status', { status: session.payment_status });
    
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
      logger.debug('Session already processed');
      return res.json({
        success: true,
        tokens_added: parseInt(session.metadata?.tokens || 0),
        new_balance: existingTransaction.balance_after,
        already_processed: true,
      });
    }
    
    const tokensToAdd = parseInt(session.metadata?.tokens || 0);

    // SECURITY: Always use authenticated user ID, not metadata
    // Validate that the session belongs to the authenticated user
    if (session.metadata?.user_id && session.metadata.user_id !== req.user.id) {
      logger.warn('Session ownership mismatch', {
        sessionOwner: session.metadata.user_id,
        authenticatedUser: req.user.id,
      });
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;

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
        logger.info('Tokens added via RPC', { newBalance: data[0]?.new_balance });
        return res.json({
          success: true,
          tokens_added: tokensToAdd,
          new_balance: data[0].new_balance,
        });
      }
      
      logger.warn('RPC failed, using fallback', error);
    } catch (rpcError) {
      logger.warn('RPC not available, using fallback');
    }
    
    // Fallback: Manual token addition if RPC fails
    // Use optimistic locking with version check to prevent race conditions

    // First, check if transaction was already recorded (idempotency)
    const { data: existingTx } = await supabaseAdmin
      .from('token_transactions')
      .select('id, balance_after')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existingTx) {
      logger.debug('Transaction already exists (race condition avoided)');
      return res.json({
        success: true,
        tokens_added: tokensToAdd,
        new_balance: existingTx.balance_after,
        already_processed: true,
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('token_balance, total_tokens_purchased, updated_at')
      .eq('id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const newBalance = (profile.token_balance || 0) + tokensToAdd;
    const originalUpdatedAt = profile.updated_at;

    // Record transaction FIRST with the expected new balance
    // This ensures we have a record even if the update fails
    const { error: txError } = await supabaseAdmin.from('token_transactions').insert({
      user_id: userId,
      transaction_type: 'purchase',
      amount: tokensToAdd,
      balance_after: newBalance,
      stripe_session_id: sessionId,
      description: `Purchased ${tokensToAdd} tokens`,
    });

    if (txError) {
      // If unique constraint violation, transaction was already processed
      if (txError.code === '23505') {
        logger.debug('Transaction already recorded (concurrent request)');
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('token_balance')
          .eq('id', userId)
          .single();
        return res.json({
          success: true,
          tokens_added: tokensToAdd,
          new_balance: existingProfile?.token_balance || newBalance,
          already_processed: true,
        });
      }
      logger.error('Transaction insert error', txError);
      return res.status(500).json({ error: 'Failed to record transaction' });
    }

    // Update profile with optimistic locking (check updated_at hasn't changed)
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        token_balance: newBalance,
        total_tokens_purchased: (profile.total_tokens_purchased || 0) + tokensToAdd
      })
      .eq('id', userId)
      .eq('updated_at', originalUpdatedAt) // Optimistic lock
      .select('token_balance')
      .single();

    if (updateError || !updatedProfile) {
      // Profile was modified concurrently - get fresh balance
      logger.warn('Concurrent profile update detected');
      const { data: freshProfile } = await supabaseAdmin
        .from('profiles')
        .select('token_balance')
        .eq('id', userId)
        .single();

      return res.json({
        success: true,
        tokens_added: tokensToAdd,
        new_balance: freshProfile?.token_balance || newBalance,
        note: 'Balance may reflect concurrent updates',
      });
    }

    logger.info('Tokens added via fallback', { newBalance: updatedProfile.token_balance });

    res.json({
      success: true,
      tokens_added: tokensToAdd,
      new_balance: updatedProfile.token_balance,
    });
  } catch (error) {
    logger.error('Verify session error', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

/**
 * GET /api/tokens/subscription
 * Get current subscription status
 */
router.get('/subscription', authenticate, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, subscription_plan, subscription_id, subscription_period_end, subscription_tokens_remaining')
      .eq('id', req.user.id)
      .single();

    if (!profile || !profile.subscription_status || profile.subscription_status === 'none') {
      return res.json({ active: false });
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === profile.subscription_plan);

    res.json({
      active: profile.subscription_status === 'active',
      status: profile.subscription_status,
      plan: plan || null,
      plan_id: profile.subscription_plan,
      period_end: profile.subscription_period_end,
      tokens_remaining: profile.subscription_tokens_remaining || 0,
    });
  } catch (error) {
    logger.error('Get subscription error', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * POST /api/tokens/subscribe
 * Create a subscription checkout session
 */
router.post('/subscribe', authenticate, checkoutLimiter, async (req, res) => {
  try {
    const { plan_id } = req.body;

    // Find the plan
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === plan_id);
    if (!plan) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }

    // Check if user already has an active subscription
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status')
      .eq('id', req.user.id)
      .single();

    if (profile?.subscription_status === 'active') {
      return res.status(400).json({ error: 'You already have an active subscription. Please cancel first to switch plans.' });
    }

    // Get or create Stripe customer
    let { data: stripeCustomer } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', req.user.id)
      .single();

    let customerId;

    if (!stripeCustomer) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          supabase_user_id: req.user.id,
        },
      });

      await supabaseAdmin.from('stripe_customers').insert({
        user_id: req.user.id,
        stripe_customer_id: customer.id,
      });

      customerId = customer.id;
    } else {
      customerId = stripeCustomer.stripe_customer_id;
    }

    // Create a Stripe Price for the subscription (or use existing)
    // In production, you'd create these prices in Stripe Dashboard and store the price IDs
    // For now, we'll create them dynamically
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: plan.price,
      recurring: { interval: 'month' },
      product_data: {
        name: `CommentIQ ${plan.name} Subscription`,
        metadata: {
          plan_id: plan.id,
          tokens_per_month: plan.tokens_per_month.toString(),
        },
      },
    });

    // Create subscription checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/tokens/success?session_id={CHECKOUT_SESSION_ID}&type=subscription`,
      cancel_url: `${process.env.FRONTEND_URL}/tokens`,
      metadata: {
        user_id: req.user.id,
        plan_id: plan.id,
        tokens_per_month: plan.tokens_per_month.toString(),
      },
      subscription_data: {
        metadata: {
          user_id: req.user.id,
          plan_id: plan.id,
          tokens_per_month: plan.tokens_per_month.toString(),
        },
      },
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    logger.error('Subscription checkout error', error);
    res.status(500).json({ error: 'Failed to create subscription checkout' });
  }
});

/**
 * POST /api/tokens/subscription/cancel
 * Cancel the current subscription
 */
router.post('/subscription/cancel', authenticate, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_id, subscription_status')
      .eq('id', req.user.id)
      .single();

    if (!profile?.subscription_id || profile.subscription_status !== 'active') {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    // Cancel at period end (user keeps access until billing period ends)
    await stripe.subscriptions.update(profile.subscription_id, {
      cancel_at_period_end: true,
    });

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({ subscription_status: 'canceling' })
      .eq('id', req.user.id);

    res.json({ success: true, message: 'Subscription will be canceled at the end of the billing period' });
  } catch (error) {
    logger.error('Cancel subscription error', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/tokens/subscription/reactivate
 * Reactivate a canceled subscription (before period ends)
 */
router.post('/subscription/reactivate', authenticate, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_id, subscription_status')
      .eq('id', req.user.id)
      .single();

    if (!profile?.subscription_id || profile.subscription_status !== 'canceling') {
      return res.status(400).json({ error: 'No subscription to reactivate' });
    }

    // Remove cancellation
    await stripe.subscriptions.update(profile.subscription_id, {
      cancel_at_period_end: false,
    });

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({ subscription_status: 'active' })
      .eq('id', req.user.id);

    res.json({ success: true, message: 'Subscription reactivated' });
  } catch (error) {
    logger.error('Reactivate subscription error', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

export default router;
