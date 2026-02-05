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

// Token package configurations
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
  // Video upload (frames + audio transcription) is included free
};

export default stripe;
