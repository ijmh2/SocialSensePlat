import logger from '../utils/logger.js';

export function remainingRefund(totalCharged, alreadyRefunded) {
  return Math.max(0, Number(totalCharged || 0) - Number(alreadyRefunded || 0));
}

export function createTokenRefunder(supabaseClient, log = logger) {
  return async function refundTokens({
    userId,
    analysisId,
    amount,
    key,
    description,
  }) {
    const requestedAmount = Math.max(0, Number.parseInt(amount, 10) || 0);
    if (!requestedAmount) return { success: true, refundedAmount: 0 };

    const parameters = {
      p_user_id: userId,
      p_amount: requestedAmount,
      p_analysis_id: analysisId,
      p_description: description,
      p_refund_key: key,
    };

    let { data, error } = await supabaseClient.rpc('refund_tokens', parameters);

    // Supports a rolling deploy before the idempotent migration has been applied.
    if (error && /function .*refund_tokens|p_refund_key|schema cache/i.test(error.message || '')) {
      ({ data, error } = await supabaseClient.rpc('refund_tokens', {
        p_user_id: userId,
        p_amount: requestedAmount,
        p_analysis_id: analysisId,
        p_description: description,
      }));
    }

    const result = data?.[0];
    if (error || !result?.success) {
      log.error('Token refund failed — manual remediation required', {
        userId,
        analysisId,
        amount: requestedAmount,
        key,
        error: error?.message || result?.message || 'Unknown refund failure',
      });
      return { success: false, refundedAmount: 0, error };
    }

    const refundedAmount = Number.isFinite(Number(result.refunded_amount))
      ? Number(result.refunded_amount)
      : requestedAmount;
    log.info('Token refund issued', {
      userId,
      analysisId,
      amount: refundedAmount,
      key,
      description,
    });
    return { success: true, refundedAmount, message: result.message };
  };
}
