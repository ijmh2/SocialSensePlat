# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SocialSense Platinum is a full-stack SaaS app for AI-powered social media comment analysis (YouTube & TikTok) with token-based billing via Stripe. All application code lives inside the `socialsense/` subdirectory.

## Commands

All commands must be run from `socialsense/` (the workspace root).

```bash
# Development (starts frontend:5173 + backend:3001 concurrently)
npm run dev

# Run only frontend or backend
npm run dev:frontend
npm run dev:backend

# Build frontend
npm run build

# Start backend in production mode
npm start

# Tests (all workspaces)
npm test

# Test single workspace
npm run test --workspace=frontend
npm run test --workspace=backend
```

Backend uses nodemon for hot reload. Frontend uses Vite with dev proxy (`/api` → `localhost:3001`).

For Stripe webhook testing locally: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`

## Architecture

**Monorepo** using npm workspaces with two packages:

### Frontend (`socialsense/frontend/`)
- React 18 + Vite, Material-UI 5 with custom neumorphic theme, Framer Motion
- All pages lazy-loaded via `React.lazy()` in [App.jsx](socialsense/frontend/src/App.jsx)
- Auth state managed through `AuthContext` (`contexts/AuthContext.jsx`) — provides user, profile, token balance
- API calls go through a centralized Axios instance (`utils/api.js`) that auto-attaches Bearer tokens
- Routes split into `PublicRoute` (redirects authed users to `/dashboard`) and `ProtectedRoute` (redirects unauthed to `/login`)
- Protected pages render inside `Layout` component (collapsible sidebar + header)
- Theme defined in `styles/theme.js` — primary: `#6C63FF`, secondary: `#38B2AC`

### Backend (`socialsense/backend/`)
- Express 4 with ES modules (`"type": "module"`)
- Entry point: [server.js](socialsense/backend/server.js)
- Route files in `routes/`: `auth.js`, `tokens.js`, `analysis.js`, `webhooks.js`
- Business logic in `services/`: `youtube.js`, `tiktok.js`, `commentProcessor.js`, `openai.js`
- Config in `config/`: `supabase.js` (admin client), `stripe.js` (client + pricing)
- Auth middleware in `middleware/auth.js` — `authenticate` (required) and `optionalAuth` (optional)
- Stripe webhook route **must** receive raw body — it's registered before `express.json()` in server.js

### Database (Supabase/PostgreSQL)
- Schema in `socialsense/supabase-schema.sql`
- Tables: `profiles`, `token_transactions`, `analyses`, `stripe_customers`
- Row-Level Security (RLS) enforced — users can only access their own data
- Key RPC functions: `deduct_tokens()` and `add_tokens()` use row locks for atomic token operations
- `handle_new_user()` trigger grants 10 welcome tokens on signup

## Key Data Flows

**Comment Analysis:** Frontend calls `POST /api/analysis/estimate` → user confirms → `POST /api/analysis/comments` deducts tokens atomically via RPC, creates analysis record, starts background processing → frontend polls `GET /api/analysis/progress/:requestId` for updates.

**Payments:** `POST /api/tokens/checkout` creates Stripe session → user redirected to Stripe → webhook at `POST /api/webhooks/stripe` calls `add_tokens` RPC → frontend also polls `GET /api/tokens/verify-session/:id`.

**Comment Processing Pipeline:** Fetch comments (YouTube API / TikTok unofficial) → filter spam/emoji-only/generic → clean text → extract themes/keywords → sample if >3000 comments → send to OpenAI GPT → store structured results.

## Environment Variables

Backend (`socialsense/backend/.env`): `PORT`, `NODE_ENV`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `OPENAI_API_KEY`, `YOUTUBE_API_KEY`, `FRONTEND_URL`

Frontend (`socialsense/frontend/.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_API_URL`

## Important Implementation Details

- Analysis progress tracking is **in-memory** on the backend (not persisted) — lost on server restart
- TikTok integration uses an unofficial API and is more fragile/rate-limited than YouTube
- Token pricing: YouTube 1 token/1000 comments, TikTok 1 token/100 comments, text/marketing analysis +5 tokens each, video analysis 20 tokens flat
- Rate limiting: 100 requests per 15 minutes per IP on all `/api/*` routes
- Backend exports `app` as default for testing with supertest
