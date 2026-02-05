# SocialSense Platinum

A full-stack social media comment analysis platform with token-based billing. Analyze YouTube and TikTok comments with AI-powered insights.

![SocialSense](https://img.shields.io/badge/SocialSense-Platinum-6366F1?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe)

## Features

- 🎬 **YouTube & TikTok Analysis** - Scrape and analyze video comments
- 🤖 **AI-Powered Insights** - GPT-4 powered analysis and recommendations
- 💰 **Token-Based Billing** - Pay-as-you-go with Stripe integration
- 📊 **Rich Visualizations** - Charts, themes, and keyword analysis
- 🎨 **Material Design 3** - Modern, beautiful UI
- 🔐 **Secure Authentication** - Supabase Auth with Google OAuth
- 📱 **Responsive Design** - Works on desktop and mobile

---

## Quick Start

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm 9+** (comes with Node.js)
- **Supabase Account** - [Sign up](https://supabase.com/) (free tier available)
- **Stripe Account** - [Sign up](https://stripe.com/) (test mode available)
- **OpenAI API Key** - [Get key](https://platform.openai.com/)
- **YouTube Data API Key** - [Get key](https://console.cloud.google.com/)

---

## Detailed Setup Guide

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository (or copy the files)
cd socialsense

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

### Step 2: Set Up Supabase

#### 2.1 Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Project name**: `socialsense` (or your choice)
   - **Database password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"** and wait for provisioning

#### 2.2 Run the Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste into the SQL editor
5. Click **"Run"** (or Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - this is correct!

#### 2.3 Get Your Supabase Keys

1. Go to **Settings** → **API** in Supabase Dashboard
2. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

#### 2.4 Enable Google OAuth (Optional but Recommended)

1. Go to **Authentication** → **Providers** in Supabase
2. Find **Google** and enable it
3. You'll need to set up Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (or use existing)
   - Go to **APIs & Services** → **Credentials**
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret**
4. Back in Supabase, paste the Client ID and Secret
5. Click **Save**

### Step 3: Set Up Stripe

#### 3.1 Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Sign up or log in
3. Make sure you're in **Test mode** (toggle in top-right)

#### 3.2 Get Stripe Keys

1. Go to **Developers** → **API keys**
2. Copy:
   - **Publishable key** → `STRIPE_PUBLISHABLE_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

#### 3.3 Set Up Stripe Webhook

1. Go to **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-backend-domain.com/api/webhooks/stripe`
   - For local development, use [Stripe CLI](https://stripe.com/docs/stripe-cli) (see below)
4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
5. Click **"Add endpoint"**
6. Click on the endpoint, then **"Reveal"** the signing secret
7. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

#### 3.4 Local Development with Stripe CLI

For local testing, you need Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
# macOS:
brew install stripe/stripe-cli/stripe

# Windows (Scoop):
scoop install stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Copy the webhook signing secret that's printed (starts with whsec_)
```

### Step 4: Get YouTube Data API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **APIs & Services** → **Library**
4. Search for **"YouTube Data API v3"**
5. Click **Enable**
6. Go to **APIs & Services** → **Credentials**
7. Click **"Create Credentials"** → **"API Key"**
8. Copy the API key → `YOUTUBE_API_KEY`
9. (Recommended) Click **"Edit API key"** and restrict to YouTube Data API v3

### Step 5: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Log in or sign up
3. Go to **API Keys** (left sidebar)
4. Click **"Create new secret key"**
5. Copy the key → `OPENAI_API_KEY`
6. Make sure you have credits or a payment method set up

### Step 6: Configure Environment Variables

#### Backend (.env)

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=eyJhbG...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...your-service-role-key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_...your-webhook-secret
STRIPE_PUBLISHABLE_KEY=pk_test_...your-publishable-key

# OpenAI Configuration
OPENAI_API_KEY=sk-...your-openai-key

# YouTube Data API
YOUTUBE_API_KEY=AIza...your-youtube-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

#### Frontend (.env)

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
# Supabase Configuration (public keys only)
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...your-anon-key

# Stripe Configuration (public key only)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...your-publishable-key

# API Base URL
VITE_API_URL=http://localhost:3001/api
```

### Step 7: Run the Application

#### Development Mode

```bash
# From the root directory
npm run dev

# This starts both frontend (port 5173) and backend (port 3001)
```

Or run separately:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

#### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api

### Step 8: Test the Application

1. **Sign Up**: Create an account (you'll get 10 free tokens)
2. **Buy Tokens**: Go to Tokens page and purchase a package
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date and any CVC
3. **Analyze Comments**: Enter a YouTube or TikTok URL and run analysis

---

## Production Deployment

### Frontend (Vercel/Netlify)

1. Push your code to GitHub
2. Connect to Vercel or Netlify
3. Set environment variables in the dashboard
4. Deploy!

### Backend (Railway/Render/Fly.io)

1. Push your code to GitHub
2. Create a new service on your platform
3. Set environment variables
4. Deploy!

### Environment Variables for Production

Update these in production:

```env
# Backend
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com

# Frontend
VITE_API_URL=https://your-backend-domain.com/api
```

### Stripe Production Keys

1. Switch to **Live mode** in Stripe Dashboard
2. Create new live API keys
3. Update webhook endpoint URL to production
4. Update all Stripe environment variables

---

## Project Structure

```
socialsense/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts (Auth)
│   │   ├── pages/           # Page components
│   │   ├── styles/          # Theme and global styles
│   │   ├── utils/           # API client, Supabase client
│   │   ├── App.jsx          # Main app with routing
│   │   └── main.jsx         # Entry point
│   ├── index.html
│   └── package.json
│
├── backend/                  # Express backend
│   ├── config/              # Supabase, Stripe config
│   ├── middleware/          # Auth middleware
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── server.js            # Express server
│   └── package.json
│
├── supabase-schema.sql      # Database schema
├── package.json             # Root package.json
└── README.md                # This file
```

---

## Token Pricing

| Action | Token Cost |
|--------|------------|
| YouTube Comments | 1 token per 1,000 comments |
| TikTok Comments | 1 token per 100 comments |
| AI Text Analysis | +5 tokens |
| Marketing Analysis | +5 tokens |
| Video Analysis | 20 tokens flat |

### Token Packages

| Package | Tokens | Price |
|---------|--------|-------|
| Starter | 100 | $4.99 |
| Creator | 500 | $19.99 (20% off) |
| Agency | 1000 | $34.99 (30% off) |

---

## API Endpoints

### Authentication
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `GET /api/auth/token-balance` - Get token balance
- `GET /api/auth/transactions` - Get transaction history

### Tokens
- `GET /api/tokens/packages` - List token packages
- `GET /api/tokens/costs` - Get token costs
- `POST /api/tokens/calculate` - Calculate analysis cost
- `POST /api/tokens/checkout` - Create Stripe checkout
- `GET /api/tokens/verify-session/:id` - Verify payment

### Analysis
- `POST /api/analysis/estimate` - Estimate analysis cost
- `POST /api/analysis/comments` - Run comment analysis
- `POST /api/analysis/video` - Run video analysis
- `GET /api/analysis/history` - Get analysis history
- `GET /api/analysis/:id` - Get analysis details
- `GET /api/analysis/:id/export` - Export as CSV

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

---

## Troubleshooting

### "Missing Supabase configuration"
- Check that all Supabase environment variables are set
- Ensure the URLs don't have trailing slashes

### "YouTube API quota exceeded"
- YouTube API has daily quotas
- Request quota increase in Google Cloud Console
- Or wait until quota resets (midnight Pacific Time)

### "Stripe webhook signature verification failed"
- Make sure you're using the correct webhook secret
- For local dev, use Stripe CLI and its provided secret

### "Failed to sign in with Google"
- Check Google OAuth credentials in Supabase
- Ensure redirect URI matches exactly

### Comments not loading for TikTok
- TikTok's API is unofficial and may be rate-limited
- Try with smaller comment limits
- Some videos may have restricted comments

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

MIT License - feel free to use this for personal or commercial projects.

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the console logs (browser and server)
3. Check that all API keys are valid and have proper permissions
4. Ensure database schema is correctly applied

---

Built with ❤️ using React, Express, Supabase, and Stripe.
