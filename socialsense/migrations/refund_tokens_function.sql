-- Refunds tokens to a user's balance and records the transaction.
-- Called when an analysis fails or fetches fewer comments than charged for.
CREATE OR REPLACE FUNCTION public.refund_tokens(
    p_user_id     UUID,
    p_amount      INTEGER,
    p_analysis_id UUID,
    p_description TEXT DEFAULT 'Token refund'
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance     INTEGER;
BEGIN
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 0, 'Refund amount must be positive'::TEXT;
        RETURN;
    END IF;

    SELECT token_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'User not found'::TEXT;
        RETURN;
    END IF;

    v_new_balance := v_current_balance + p_amount;

    UPDATE public.profiles
    SET token_balance = v_new_balance
    WHERE id = p_user_id;

    INSERT INTO public.token_transactions
        (user_id, transaction_type, amount, balance_after, description, metadata)
    VALUES
        (p_user_id, 'refund', p_amount, v_new_balance, p_description,
         jsonb_build_object('analysis_id', p_analysis_id));

    RETURN QUERY SELECT TRUE, v_new_balance,
        format('Refunded %s token(s)', p_amount)::TEXT;
END;
$$;
