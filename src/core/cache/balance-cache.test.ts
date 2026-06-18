import { describe, expect, it } from 'vitest';

import type { Balance } from '../types';
import { BalanceCache } from './balance-cache';

const balance: Balance = { userId: 'u1', balance: 100 };

describe('BalanceCache', () => {
  it('returns a fresh value within the TTL', () => {
    let clock = 0;
    const cache = new BalanceCache(1000, () => clock);
    cache.set('u1', balance);
    clock = 999;
    expect(cache.get('u1')).toEqual(balance);
  });

  it('expires the value once the TTL elapses', () => {
    let clock = 0;
    const cache = new BalanceCache(1000, () => clock);
    cache.set('u1', balance);
    clock = 1000;
    expect(cache.get('u1')).toBeUndefined();
  });

  it('still serves the stale value after expiry for the fallback path', () => {
    let clock = 0;
    const cache = new BalanceCache(1000, () => clock);
    cache.set('u1', balance);
    clock = 5000;
    expect(cache.get('u1')).toBeUndefined();
    expect(cache.getStale('u1')).toEqual(balance);
  });

  it('invalidate drops the entry entirely', () => {
    const cache = new BalanceCache(1000);
    cache.set('u1', balance);
    cache.invalidate('u1');
    expect(cache.getStale('u1')).toBeUndefined();
  });
});
