import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeWrapper } from '../test-utils';
import { useCreditGate } from './use-credit-gate';

describe('useCreditGate', () => {
  it('returns true and stays unblocked when credits are sufficient', async () => {
    const client = {
      estimate: vi.fn().mockResolvedValue({ requiredCredits: 10, balance: 100, sufficient: true }),
    };
    const { result } = renderHook(() => useCreditGate(), { wrapper: makeWrapper(client) });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.checkCredits('generate_voice', { durationMinutes: 2 });
    });

    expect(ok).toBe(true);
    expect(result.current.isBlocked).toBe(false);
    expect(client.estimate).toHaveBeenCalledWith({
      userId: 'u1',
      operation: 'generate_voice',
      durationMinutes: 2,
      quantity: undefined,
    });
  });

  it('blocks and records the estimate when credits are insufficient', async () => {
    const client = {
      estimate: vi.fn().mockResolvedValue({ requiredCredits: 200, balance: 10, sufficient: false }),
    };
    const { result } = renderHook(() => useCreditGate(), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.checkCredits('generate_voice');
    });

    expect(result.current.isBlocked).toBe(true);
    expect(result.current.lastEstimate?.requiredCredits).toBe(200);

    act(() => result.current.reset());
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.lastEstimate).toBeUndefined();
  });
});
