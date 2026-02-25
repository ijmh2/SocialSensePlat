import Stripe from 'stripe';

// Railway provides env vars directly
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set!');
  process.exit(1);
}

console.log('✅ Stripe configured');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Token package configurations (one-time purchases)
export const TOKEN_PACKAGES = [
  {
    id: 'tokens_100',
    name: '100 Tokens',
    tokens: 100,
    price: 499, // cents
    description: 'Analyze up to 10,000 YouTube comments or 1,000 TikTok comments',
    popular: false,
  },
  {
    id: 'tokens_500',
    name: '500 Tokens',
    tokens: 500,
    price: 1999, // cents ($19.99 - 20% discount)
    description: 'Best for regular content creators',
    popular: true,
  },
  {
    id: 'tokens_1000',
    name: '1000 Tokens',
    tokens: 1000,
    price: 3499, // cents ($34.99 - 30% discount)
    description: 'Best for agencies and power users',
    popular: false,
  },
];

// Subscription plans (monthly recurring)
export const SUBSCRIPTION_PLANS = [
  {
    id: 'sub_starter',
    name: 'Starter',
    tokens_per_month: 150,
    price: 1499, // cents ($14.99/month)
    description: 'Perfect for content creators',
    features: [
      '150 tokens/month',
      'Rollover unused tokens (max 300)',
      'Priority support',
    ],
    popular: false,
  },
  {
    id: 'sub_pro',
    name: 'Pro',
    tokens_per_month: 500,
    price: 3999, // cents ($39.99/month)
    description: 'For agencies and power users',
    features: [
      '500 tokens/month',
      'Rollover unused tokens (max 1000)',
      'Priority support',
      '20% bonus on token purchases',
    ],
    popular: true,
  },
  {
    id: 'sub_enterprise',
    name: 'Enterprise',
    tokens_per_month: 1500,
    price: 9999, // cents ($99.99/month)
    description: 'Unlimited power for large teams',
    features: [
      '1500 tokens/month',
      'Unlimited token rollover',
      'Dedicated support',
      '30% bonus on token purchases',
      'API access (coming soon)',
    ],
    popular: false,
  },
];

// Token costs per action
export const TOKEN_COSTS = {
  // YouTube: 1 token per 1,000 comments
  youtube_per_1000_comments: 1,
  // TikTok: 1 token per 100 comments (10x harder to scrape)
  tiktok_per_100_comments: 1,
  // Text analysis addon
  text_analysis: 5,
  // Marketing analysis addon
  marketing_analysis: 5,
  // Video upload (frames + Whisper transcription + GPT-4o vision)
  video_analysis: 20,
  // Engagement validation (GPT-5.2 powered, YouTube/TikTok only)
  engagement_validation: 20,
};

export default stripe;
