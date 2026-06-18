import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeWrapper } from '../test-utils';
import { useEntitlement, useEntitlements } from './use-entitlements';

const client = {
  getEntitlements: vi.fn().mockResolvedValue({
    plan: { code: 'pro', name: 'Pro' },
    features: { sell_audio: true, bulk_export: false },
    limits: { storageGb: 50 },
  }),
};

describe('useEntitlements', () => {
  it('exposes plan, features, and limits', async () => {
    const { result } = renderHook(() => useEntitlements(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.plan?.code).toBe('pro');
    expect(result.current.features.sell_audio).toBe(true);
    expect(result.current.limits.storageGb).toBe(50);
  });

  it('useEntitlement resolves a single feature gate', async () => {
    const { result } = renderHook(() => useEntitlement('sell_audio'), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('useEntitlement is false for a disabled feature', async () => {
    const { result } = renderHook(() => useEntitlement('bulk_export'), {
      wrapper: makeWrapper(client),
    });

    // settle the query, then assert false
    await waitFor(() => expect(client.getEntitlements).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
