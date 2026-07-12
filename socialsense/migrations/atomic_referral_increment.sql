-- Atomic referral count increment
-- Prevents lost updates when two referrals resolve concurrently for the same referrer.
CREATE OR REPLACE FUNCTION public.increment_referral_count(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET referral_count = COALESCE(referral_count, 0) + 1
  WHERE id = p_user_id;
END;
$$;
