-- Make analysis refunds idempotent and cap them at the original analysis charge.
-- Apply this migration before relying on refund keys across worker retries.

DROP FUNCTION IF EXISTS public.refund_tokens(UUID, INTEGER, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.refund_tokens(
    p_user_id     UUID,
    p_amount      INTEGER,
    p_analysis_id UUID,
    p_description TEXT DEFAULT 'Token refund',
    p_refund_key  TEXT DEFAULT 'refund'
)
RETURNS TABLE (
    success BOOLEAN,
    new_balance INTEGER,
    message TEXT,
    refunded_amount INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance  INTEGER;
    v_new_balance      INTEGER;
    v_tokens_used      INTEGER;
    v_already_refunded INTEGER;
    v_refund_amount    INTEGER;
BEGIN
    IF p_amount <= 0 OR p_refund_key IS NULL OR btrim(p_refund_key) = '' THEN
        RETURN QUERY SELECT FALSE, 0, 'Refund amount and key must be valid'::TEXT, 0;
        RETURN;
    END IF;

    SELECT tokens_used INTO v_tokens_used
    FROM public.analyses
    WHERE id = p_analysis_id AND user_id = p_user_id
    FOR UPDATE;

    IF v_tokens_used IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'Analysis not found'::TEXT, 0;
        RETURN;
    END IF;

    SELECT token_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'User not found'::TEXT, 0;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.token_transactions
        WHERE user_id = p_user_id
          AND transaction_type = 'refund'
          AND metadata->>'analysis_id' = p_analysis_id::TEXT
          AND metadata->>'refund_key' = p_refund_key
    ) THEN
        RETURN QUERY SELECT TRUE, v_current_balance, 'Refund already processed'::TEXT, 0;
        RETURN;
    END IF;

    SELECT COALESCE(SUM(amount), 0)::INTEGER INTO v_already_refunded
    FROM public.token_transactions
    WHERE user_id = p_user_id
      AND transaction_type = 'refund'
      AND metadata->>'analysis_id' = p_analysis_id::TEXT;

    v_refund_amount := LEAST(p_amount, GREATEST(0, v_tokens_used - v_already_refunded));
    IF v_refund_amount <= 0 THEN
        RETURN QUERY SELECT TRUE, v_current_balance, 'Analysis charge is already fully refunded'::TEXT, 0;
        RETURN;
    END IF;

    v_new_balance := v_current_balance + v_refund_amount;

    UPDATE public.profiles
    SET token_balance = v_new_balance
    WHERE id = p_user_id;

    INSERT INTO public.token_transactions
        (user_id, transaction_type, amount, balance_after, description, metadata)
    VALUES
        (p_user_id, 'refund', v_refund_amount, v_new_balance, p_description,
         jsonb_build_object('analysis_id', p_analysis_id, 'refund_key', p_refund_key));

    RETURN QUERY SELECT TRUE, v_new_balance,
        format('Refunded %s token(s)', v_refund_amount)::TEXT, v_refund_amount;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_token_refunds_analysis_key
ON public.token_transactions (
    user_id,
    (metadata->>'analysis_id'),
    (metadata->>'refund_key')
)
WHERE transaction_type = 'refund'
  AND metadata->>'analysis_id' IS NOT NULL
  AND metadata->>'refund_key' IS NOT NULL;

REVOKE ALL ON FUNCTION public.refund_tokens(UUID, INTEGER, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_tokens(UUID, INTEGER, UUID, TEXT, TEXT) TO service_role;
