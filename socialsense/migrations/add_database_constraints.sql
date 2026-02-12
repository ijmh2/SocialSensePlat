-- Database Constraints Migration
-- Adds safety constraints to prevent data integrity issues

-- 1. Ensure token_balance cannot go negative
ALTER TABLE public.profiles
ADD CONSTRAINT check_token_balance_non_negative
CHECK (token_balance >= 0);

-- 2. Ensure unique stripe_session_id to prevent duplicate webhook processing
-- First add the column if it doesn't exist (some older transactions may not have it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'token_transactions'
        AND column_name = 'stripe_session_id'
    ) THEN
        ALTER TABLE public.token_transactions
        ADD COLUMN stripe_session_id TEXT;
    END IF;
END $$;

-- Create unique index for stripe_session_id (allows NULLs, only enforces uniqueness on non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_token_transactions_stripe_session_unique
ON public.token_transactions (stripe_session_id)
WHERE stripe_session_id IS NOT NULL;

-- 3. Ensure referral_code is unique (may already exist from referral system migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'profiles'
        AND indexname = 'profiles_referral_code_key'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
    NULL;
END $$;

-- 4. Ensure referred_id in referral_bonuses is unique (user can only be referred once)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'referral_bonuses'
        AND indexname = 'referral_bonuses_referred_id_key'
    ) THEN
        ALTER TABLE public.referral_bonuses
        ADD CONSTRAINT referral_bonuses_referred_id_key UNIQUE (referred_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
    NULL;
END $$;

-- 5. Add index for faster lookups on common queries
CREATE INDEX IF NOT EXISTS idx_analyses_user_created
ON public.analyses (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_transactions_user_created
ON public.token_transactions (user_id, created_at DESC);

-- 6. Ensure tokens_awarded in referral_bonuses is positive
ALTER TABLE public.referral_bonuses
ADD CONSTRAINT check_tokens_awarded_positive
CHECK (tokens_awarded > 0);
