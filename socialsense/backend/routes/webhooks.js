import express from 'express';
import stripe, { SUBSCRIPTION_PLANS } from '../config/stripe.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Validate webhook secret is configured
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  // Validate signature header exists
  if (!sig) {
    console.error('Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook verification failed' });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;

      // Handle one-time payment (token purchase)
      if (session.mode === 'payment' && session.payment_status === 'paid') {
        const userId = session.metadata?.user_id;
        const tokens = parseInt(session.metadata?.tokens || '0');

        if (userId && tokens > 0) {
          // Check if already processed
          const { data: existingTransaction } = await supabaseAdmin
            .from('token_transactions')
            .select('id')
            .eq('stripe_session_id', session.id)
            .single();

          if (!existingTransaction) {
            // Add tokens
            const { data, error } = await supabaseAdmin.rpc('add_tokens', {
              p_user_id: userId,
              p_amount: tokens,
              p_stripe_session_id: session.id,
              p_description: `Purchased ${tokens} tokens`,
            });

            if (error) {
              console.error('Failed to add tokens via webhook:', error);
              return res.status(500).json({ error: 'Failed to add tokens' });
            }
            console.log(`✅ Added ${tokens} tokens to user ${userId}`);
          }
        }
      }

      // Handle subscription creation
      if (session.mode === 'subscription') {
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        const tokensPerMonth = parseInt(session.metadata?.tokens_per_month || '0');
        const subscriptionId = session.subscription;

        if (userId && planId && subscriptionId) {
          // Get subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          // Update user profile with subscription info
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'active',
              subscription_plan: planId,
              subscription_id: subscriptionId,
              subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              subscription_tokens_remaining: tokensPerMonth,
            })
            .eq('id', userId);

          if (updateError) {
            console.error('Failed to update subscription:', updateError);
            return res.status(500).json({ error: 'Failed to update subscription' });
          }

          // Add initial subscription tokens
          const { error: tokenError } = await supabaseAdmin.rpc('add_tokens', {
            p_user_id: userId,
            p_amount: tokensPerMonth,
            p_stripe_session_id: session.id,
            p_description: `Subscription tokens (${planId})`,
          });

          if (tokenError) {
            console.error('Failed to add subscription tokens:', tokenError);
          }

          console.log(`✅ Subscription activated for user ${userId}: ${planId} (${tokensPerMonth} tokens)`);
        }
      }
      break;
    }

    // Invoice paid - recurring subscription payment
    case 'invoice.paid': {
      const invoice = event.data.object;

      // Only process subscription invoices (not the first one, which is handled above)
      if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
        const subscriptionId = invoice.subscription;

        // Get subscription metadata
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.user_id;
        const planId = subscription.metadata?.plan_id;
        const tokensPerMonth = parseInt(subscription.metadata?.tokens_per_month || '0');

        if (userId && tokensPerMonth > 0) {
          // Check if already processed
          const { data: existingTransaction } = await supabaseAdmin
            .from('token_transactions')
            .select('id')
            .eq('stripe_session_id', invoice.id)
            .single();

          if (!existingTransaction) {
            // Unlimited rollover - just update period end
            await supabaseAdmin
              .from('profiles')
              .update({
                subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              })
              .eq('id', userId);

            // Add monthly tokens (they stack with existing balance - unlimited rollover)
            const { error: tokenError } = await supabaseAdmin.rpc('add_tokens', {
              p_user_id: userId,
              p_amount: tokensPerMonth,
              p_stripe_session_id: invoice.id,
              p_description: `Monthly subscription tokens (${planId})`,
            });

            if (tokenError) {
              console.error('Failed to add renewal tokens:', tokenError);
              return res.status(500).json({ error: 'Failed to add renewal tokens' });
            }

            console.log(`✅ Subscription renewed for user ${userId}: +${tokensPerMonth} tokens (unlimited rollover)`);
          }
        }
      }
      break;
    }

    // Subscription canceled or ended
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: 'none',
            subscription_plan: null,
            subscription_id: null,
            subscription_period_end: null,
          })
          .eq('id', userId);

        console.log(`✅ Subscription ended for user ${userId}`);
      }
      break;
    }

    // Subscription updated (e.g., plan change, cancellation scheduled)
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        const status = subscription.cancel_at_period_end ? 'canceling' :
                       subscription.status === 'active' ? 'active' : subscription.status;

        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: status,
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', userId);

        console.log(`✅ Subscription updated for user ${userId}: ${status}`);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.log('Payment failed:', paymentIntent.id);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.user_id;

        if (userId) {
          await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', userId);

          console.log(`⚠️ Subscription payment failed for user ${userId}`);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

export default router;
