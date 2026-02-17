import express from 'express';
import stripe from '../config/stripe.js';
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
      
      // Only process if payment was successful
      if (session.payment_status === 'paid') {
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
              // Return 500 so Stripe will retry the webhook
              return res.status(500).json({ error: 'Failed to add tokens' });
            }
            console.log(`✅ Added ${tokens} tokens to user ${userId}`);
          }
        }
      }
      break;
    }
    
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.log('Payment failed:', paymentIntent.id);
      break;
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  
  res.json({ received: true });
});

export default router;
