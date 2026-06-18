import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useMonetization } from './context';
import { makeWrapper } from './test-utils';

describe('useMonetization', () => {
  it('throws when used outside a provider', () => {
    expect(() => renderHook(() => useMonetization())).toThrow(/within a <MonetizationProvider>/);
  });

  it('returns the client and userId from context', () => {
    const client = {};
    const { result } = renderHook(() => useMonetization(), {
      wrapper: makeWrapper(client, 'user-42'),
    });
    expect(result.current.userId).toBe('user-42');
    expect(result.current.client).toBe(client);
  });
});
