import { describe, expect, it, vi } from 'vitest';
import { createTokenRefunder, remainingRefund } from '../services/tokenRefund.js';

const request = {
  userId: 'user-id',
  analysisId: 'analysis-id',
  amount: 10,
  key: 'llm_analysis',
  description: 'LLM failed',
};

describe('token refund policy', () => {
  it('uses the actual capped amount returned by the database', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ success: true, refunded_amount: 4, message: 'capped' }],
      error: null,
    });
    const refund = createTokenRefunder({ rpc }, { info: vi.fn(), error: vi.fn() });

    await expect(refund(request)).resolves.toEqual(expect.objectContaining({
      success: true,
      refundedAmount: 4,
    }));
    expect(rpc).toHaveBeenCalledWith('refund_tokens', expect.objectContaining({
      p_refund_key: 'llm_analysis',
    }));
  });

  it('treats a duplicate refund as a successful zero-credit operation', async () => {
    const refund = createTokenRefunder({
      rpc: vi.fn().mockResolvedValue({
        data: [{ success: true, refunded_amount: 0, message: 'already processed' }],
        error: null,
      }),
    }, { info: vi.fn(), error: vi.fn() });

    await expect(refund(request)).resolves.toEqual(expect.objectContaining({ refundedAmount: 0 }));
  });

  it('falls back safely while the database migration rolls out', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'schema cache: p_refund_key missing' } })
      .mockResolvedValueOnce({
        data: [{ success: true, message: 'legacy refund' }],
        error: null,
      });
    const refund = createTokenRefunder({ rpc }, { info: vi.fn(), error: vi.fn() });

    await expect(refund(request)).resolves.toEqual(expect.objectContaining({ refundedAmount: 10 }));
    expect(rpc).toHaveBeenNthCalledWith(2, 'refund_tokens', expect.not.objectContaining({
      p_refund_key: expect.anything(),
    }));
  });

  it('never lets a terminal refund exceed the unpaid remainder', () => {
    expect(remainingRefund(15, 10)).toBe(5);
    expect(remainingRefund(10, 15)).toBe(0);
  });
});
