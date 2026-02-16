-- Production Hardening Migration
-- Additional constraints and indexes for production readiness
-- Run this in Supabase SQL Editor after previous migrations

-- 1. Ensure token_transaction amount is never zero
ALTER TABLE public.token_transactions
ADD CONSTRAINT IF NOT EXISTS check_amount_not_zero
CHECK (amount != 0);

-- 2. Add composite index for scheduled analyses queries
CREATE INDEX IF NOT EXISTS idx_scheduled_analyses_active_user
ON public.scheduled_analyses (user_id, is_active, next_run_at)
WHERE is_active = true;

-- 3. Add index for Stripe session lookups (non-unique for query performance)
CREATE INDEX IF NOT EXISTS idx_token_transactions_stripe_session
ON public.token_transactions (stripe_session_id)
WHERE stripe_session_id IS NOT NULL;

-- 4. Add NOT NULL constraints where missing (with defaults for existing data)
DO $$
BEGIN
    -- Ensure comment_count has a default
    ALTER TABLE public.analyses
    ALTER COLUMN comment_count SET DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
    -- Column might already have default
    NULL;
END $$;

-- 5. Add check constraint for max_comments in scheduled_analyses
ALTER TABLE public.scheduled_analyses
ADD CONSTRAINT IF NOT EXISTS check_max_comments_range
CHECK (max_comments >= 1 AND max_comments <= 10000);

-- 6. Create function to validate URL format (basic check)
CREATE OR REPLACE FUNCTION public.is_valid_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic URL validation
    RETURN url ~ '^https?://[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Add rate limiting tracking table for API abuse prevention
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_endpoint
ON public.rate_limit_log (user_id, endpoint, window_start);

-- RLS for rate_limit_log (only service_role can access)
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup old rate limit entries (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log()
RETURNS void AS $$
BEGIN
    DELETE FROM public.rate_limit_log
    WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Ensure profiles.updated_at is always updated
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to profiles if not already exists
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Apply to analyses if not already exists
DROP TRIGGER IF EXISTS update_analyses_updated_at ON public.analyses;
CREATE TRIGGER update_analyses_updated_at
    BEFORE UPDATE ON public.analyses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_valid_url(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_log() TO service_role;
