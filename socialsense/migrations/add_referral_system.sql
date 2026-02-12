-- Migration: Add Referral Bonus System
-- Run this in Supabase SQL Editor

-- ========================================================
-- REFERRAL SYSTEM: Invite friends, both get 10 tokens
-- ========================================================

-- Add referral columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Create index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- Create referral_bonuses table for tracking
CREATE TABLE IF NOT EXISTS public.referral_bonuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tokens_awarded INTEGER DEFAULT 10, -- 10 to each party
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referred_id) -- Can only be referred once
);

-- RLS for referral_bonuses
ALTER TABLE public.referral_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral bonuses as referrer"
    ON public.referral_bonuses FOR SELECT
    USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view own referral bonus as referred"
    ON public.referral_bonuses FOR SELECT
    USING (auth.uid() = referred_id);

-- Grant access to service role (for backend operations)
GRANT ALL ON public.referral_bonuses TO service_role;

-- Function to generate a unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Avoid confusing chars like 0/O, 1/I
    code TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure referral code exists on profile
CREATE OR REPLACE FUNCTION ensure_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        -- Generate unique code with retry logic
        LOOP
            NEW.referral_code := generate_referral_code();
            -- Check if code already exists
            IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = NEW.referral_code AND id != NEW.id) THEN
                EXIT;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate referral code
DROP TRIGGER IF EXISTS ensure_referral_code_trigger ON public.profiles;
CREATE TRIGGER ensure_referral_code_trigger
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_referral_code();

-- Generate referral codes for existing users who don't have one
UPDATE public.profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- Make sure all referral codes are unique (in case of collision, regenerate)
DO $$
DECLARE
    dup_record RECORD;
BEGIN
    FOR dup_record IN (
        SELECT id, referral_code
        FROM public.profiles
        WHERE referral_code IN (
            SELECT referral_code FROM public.profiles GROUP BY referral_code HAVING COUNT(*) > 1
        )
    ) LOOP
        UPDATE public.profiles
        SET referral_code = generate_referral_code()
        WHERE id = dup_record.id;
    END LOOP;
END $$;
