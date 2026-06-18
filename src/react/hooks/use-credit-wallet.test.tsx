import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeWrapper } from '../test-utils';
import { useCreditWallet } from './use-credit-wallet';

describe('useCreditWallet', () => {
  it('exposes balance, lifetime stats, and ledger once loaded', async () => {
    const client = {
      getBalance: vi.fn().mockResolvedValue({
        userId: 'u1',
        balance: 120,
        lifetimeEarned: 500,
        lifetimeSpent: 380,
      }),
      getCreditLedger: vi.fn().mockResolvedValue({
        total: 1,
        entries: [{ id: 'l1', kind: 'GRANT', amount: 100, balanceAfter: 120, createdAt: '' }],
      }),
    };

    const { result } = renderHook(() => useCreditWallet(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.balance).toBe(120);
    expect(result.current.lifetimeEarned).toBe(500);
    expect(result.current.ledger).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(client.getCreditLedger).toHaveBeenCalledWith('u1', { limit: 50, offset: 0 });
  });

  it('defaults to safe empty values before data arrives', () => {
    const client = {
      getBalance: (): Promise<never> => new Promise(() => undefined),
      getCreditLedger: (): Promise<never> => new Promise(() => undefined),
    };
    const { result } = renderHook(() => useCreditWallet(), { wrapper: makeWrapper(client) });

    expect(result.current.balance).toBe(0);
    expect(result.current.ledger).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });
});
