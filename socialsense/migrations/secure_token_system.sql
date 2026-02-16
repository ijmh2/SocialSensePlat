-- Migration: Secure Token System (Critical Security Fixes)
-- Run this in Supabase SQL Editor

-- 1. DROP UNSAFE POLICIES
-- ========================================================

-- Drop the overly permissive profile update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Drop the unsafe transaction insert policy
DROP POLICY IF EXISTS "System can insert transactions" ON public.token_transactions;


-- 2. CREATE SECURE POLICIES
-- ========================================================

-- Profiles: Allow users to update ONLY non-sensitive data
-- We achieve this by re-enabling the update policy but adding a trigger protection
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Transactions: detailed control
-- Users can NEVER insert transactions. Only the system (service_role) can.
CREATE POLICY "System can insert transactions" ON public.token_transactions FOR INSERT WITH CHECK (
    -- This ensures only the service role or unexpected admin roles can insert
    -- Regular auth users (authenticated) cannot pass this check if we rely on RLS being enabled
    -- However, RLS is bypassed by service_role anyway. 
    -- So we actually just REMOVE the policy for authenticated users entirely.
    -- If no policy exists for INSERT, then by default, no one can insert (denylist).
    -- Since we dropped the "System can insert transactions" policy above which likely had "TO public" or implicit,
    -- efficiently, valid users are now blocked from inserting.
    -- We'll add a policy specifically for service_role just to be explicit if needed, 
    -- but usually service_role bypasses RLS. 
    -- So strictly speaking, we just need to NOT have a policy that grants INSERT to 'authenticated'.
    false 
);


-- 3. COLUMN PROTECTION TRIGGER
-- ========================================================

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the user is trying to change sensitive columns
    -- tailored for 'authenticated' role users
    IF (auth.role() = 'authenticated') THEN
        IF (NEW.token_balance IS DISTINCT FROM OLD.token_balance) THEN
            RAISE EXCEPTION 'You cannot manually update your token balance.';
        END IF;

        IF (NEW.total_tokens_purchased IS DISTINCT FROM OLD.total_tokens_purchased) THEN
             RAISE EXCEPTION 'You cannot manually update your purchase history.';
        END IF;
        
        IF (NEW.total_analyses_run IS DISTINCT FROM OLD.total_analyses_run) THEN
             RAISE EXCEPTION 'You cannot manually update your analysis stats.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
DROP TRIGGER IF EXISTS protect_profile_sensitive_update ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_sensitive_profile_columns();


-- 4. FIX SCHEDULER RACE CONDITION (Locking)
-- ========================================================

-- Function to claim a scheduled analysis atomically
CREATE OR REPLACE FUNCTION public.claim_scheduled_analysis(p_schedule_id UUID, p_next_run_future TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    -- Try to update the record setting the next_run_at to the future 
    -- This acts as a lock because the "processDueSchedules" query looks for next_run_at <= NOW()
    UPDATE public.scheduled_analyses
    SET next_run_at = p_next_run_future,
        updated_at = NOW()
    WHERE id = p_schedule_id
    AND next_run_at <= NOW(); -- Ensure it's still due
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    RETURN (v_updated > 0); -- Returns true if we successfully claimed it
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
