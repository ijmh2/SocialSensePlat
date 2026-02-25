-- ========================================================
-- SocialSense Platinum - Database Schema for Supabase
-- Run this in your Supabase SQL Editor
-- ========================================================

-- ========================================================
-- 1. CLEANUP (Ensures a fresh start)
-- ========================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS deduct_tokens(UUID, INTEGER, TEXT, JSONB);
DROP FUNCTION IF EXISTS add_tokens(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_updated_at();
DROP TABLE IF EXISTS public.stripe_customers CASCADE;
DROP TABLE IF EXISTS public.analyses CASCADE;
DROP TABLE IF EXISTS public.token_transactions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- 2. TABLES
-- ========================================================

-- PROFILES: Stores user data and token balances
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    token_balance INTEGER DEFAULT 0 NOT NULL,
    total_tokens_purchased INTEGER DEFAULT 0 NOT NULL,
    total_analyses_run INTEGER DEFAULT 0 NOT NULL,

    -- Subscription fields
    subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'canceling', 'past_due', 'canceled')),
    subscription_plan TEXT,
    subscription_id TEXT,
    subscription_period_end TIMESTAMP WITH TIME ZONE,
    subscription_tokens_remaining INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TOKEN TRANSACTIONS: History of purchases and usage
CREATE TABLE public.token_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    stripe_payment_intent_id TEXT,
    stripe_session_id TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ANALYSES: Results from SocialSense AI
CREATE TABLE public.analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('youtube_comments', 'tiktok_comments', 'video_analysis')),
    platform TEXT NOT NULL,
    video_url TEXT,
    video_title TEXT,
    tokens_used INTEGER NOT NULL,
    comment_count INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- Analysis Results
    summary TEXT,
    keywords JSONB DEFAULT '[]',
    themes JSONB DEFAULT '[]',
    sentiment_scores JSONB DEFAULT '{}',
    marketing_insights TEXT,

    -- Raw data (for CSV export)
    raw_comments JSONB DEFAULT '[]',
    filter_stats JSONB DEFAULT '{}',

    -- Video Analysis
    has_video BOOLEAN DEFAULT FALSE,
    video_transcript TEXT,
    video_score INTEGER,
    priority_improvement TEXT,
    score_breakdown JSONB,
    notes_assessment TEXT,

    -- Video Ownership
    is_my_video BOOLEAN DEFAULT FALSE,
    is_competitor BOOLEAN DEFAULT FALSE,
    creator_notes TEXT,
    competitor_notes TEXT,
    competitor_analysis TEXT,
    action_items JSONB DEFAULT '[]',

    -- Engagement Validation (GPT-5.2)
    engagement_validation JSONB,

    -- Metadata
    include_marketing BOOLEAN DEFAULT FALSE,
    product_description TEXT,
    error_message TEXT,
    processing_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STRIPE CUSTOMERS: Mapping for payments
CREATE TABLE public.stripe_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- 3. INDEXES
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON public.token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON public.token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON public.analyses(status);

-- ========================================================
-- 4. SECURITY (RLS) & PERMISSIONS
-- ========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- Profiles: Allow viewing, updating, AND inserting
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- Transactions: Allow viewing own, system can insert
CREATE POLICY "Users can view own transactions" ON public.token_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON public.token_transactions FOR INSERT WITH CHECK (true);

-- Analyses: Full access for own data
CREATE POLICY "Users can view own analyses" ON public.analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own analyses" ON public.analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analyses" ON public.analyses FOR UPDATE USING (auth.uid() = user_id);

-- Stripe: View own
CREATE POLICY "Users can view own stripe customer" ON public.stripe_customers FOR SELECT USING (auth.uid() = user_id);

-- ========================================================
-- 5. HELPER FUNCTIONS
-- ========================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_analyses_updated_at
    BEFORE UPDATE ON public.analyses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========================================================
-- 6. THE AUTH BRIDGE (Trigger Function)
-- ========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, token_balance)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        10  -- Initial free tokens
    );
    
    INSERT INTO public.token_transactions (user_id, transaction_type, amount, balance_after, description)
    VALUES (NEW.id, 'bonus', 10, 10, 'Welcome bonus tokens');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================================
-- 7. TOKEN MANAGEMENT FUNCTIONS
-- ========================================================

-- Function to deduct tokens (called from backend with service role)
CREATE OR REPLACE FUNCTION public.deduct_tokens(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, message TEXT) AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current balance with row lock
    SELECT token_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'User not found'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT FALSE, v_current_balance, 'Insufficient tokens'::TEXT;
        RETURN;
    END IF;
    
    v_new_balance := v_current_balance - p_amount;
    
    -- Update balance
    UPDATE public.profiles
    SET token_balance = v_new_balance,
        total_analyses_run = total_analyses_run + 1
    WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO public.token_transactions (user_id, transaction_type, amount, balance_after, description, metadata)
    VALUES (p_user_id, 'usage', -p_amount, v_new_balance, p_description, p_metadata);
    
    RETURN QUERY SELECT TRUE, v_new_balance, 'Tokens deducted successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add tokens (called from backend with service role after Stripe payment)
CREATE OR REPLACE FUNCTION public.add_tokens(
    p_user_id UUID,
    p_amount INTEGER,
    p_stripe_session_id TEXT,
    p_description TEXT DEFAULT 'Token purchase'
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, message TEXT) AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current balance with row lock
    SELECT token_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'User not found'::TEXT;
        RETURN;
    END IF;
    
    v_new_balance := v_current_balance + p_amount;
    
    -- Update balance
    UPDATE public.profiles
    SET token_balance = v_new_balance,
        total_tokens_purchased = total_tokens_purchased + p_amount
    WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO public.token_transactions (user_id, transaction_type, amount, balance_after, stripe_session_id, description)
    VALUES (p_user_id, 'purchase', p_amount, v_new_balance, p_stripe_session_id, p_description);
    
    RETURN QUERY SELECT TRUE, v_new_balance, 'Tokens added successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 8. ACCESS GRANTS
-- ========================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ========================================================
-- DONE! Your database is ready.
-- ========================================================
