import { describe, expect, it, vi } from 'vitest';

import { resolveConfig } from '../config';
import { CircuitOpenError, InsufficientCreditsError, NetworkError } from '../errors';
import type { MonetizationClient } from '../monetization-client';
import { HostedWalletStore } from './hosted-wallet-store';

function makeStore(clientOverrides: Partial<MonetizationClient>, fallback: 'fail-open' | 'fail-closed') {
  const config = resolveConfig({
    baseUrl: 'https://api.test',
    fallback,
    fetch: vi.fn() as unknown as typeof fetch,
    now: () => 1_000,
  });
  const client = clientOverrides as MonetizationClient;
  return new HostedWalletStore(client, config);
}

describe('HostedWalletStore', () => {
  it('reserve caches the returned balance', async () => {
    const createReservation = vi.fn(async () => ({
      reservationId: 'r1',
      heldAmount: 10,
      balance: 90,
      expiresAt: '2026-01-01T00:00:00Z',
    }));
    const getBalance = vi.fn();
    const store = makeStore({ createReservation, getBalance } as never, 'fail-closed');

    const res = await store.reserve('u1', 'generate_voice');
    expect(res.reservationId).toBe('r1');

    // subsequent getBalance is served from cache, not the network
    const balance = await store.getBalance('u1');
    expect(balance.balance).toBe(90);
    expect(getBalance).not.toHaveBeenCalled();
  });

  it('propagates InsufficientCreditsError even under fail-open', async () => {
    const createReservation = vi.fn(async () => {
      throw new InsufficientCreditsError(2, 10);
    });
    const store = makeStore({ createReservation } as never, 'fail-open');

    await expect(store.reserve('u1', 'op')).rejects.toBeInstanceOf(InsufficientCreditsError);
  });

  it('fail-open mints an optimistic reservation on outage', async () => {
    const createReservation = vi.fn(async () => {
      throw new CircuitOpenError();
    });
    const store = makeStore({ createReservation } as never, 'fail-open');

    const res = await store.reserve('u1', 'op');
    expect(res.reservationId).toMatch(/^optimistic:/);
    expect(res.heldAmount).toBe(0);
  });

  it('fail-closed rethrows on outage', async () => {
    const createReservation = vi.fn(async () => {
      throw new NetworkError('down');
    });
    const store = makeStore({ createReservation } as never, 'fail-closed');

    await expect(store.reserve('u1', 'op')).rejects.toBeInstanceOf(NetworkError);
  });

  it('commit/void no-op for optimistic reservations (never hit the API)', async () => {
    const commitReservation = vi.fn();
    const voidReservation = vi.fn();
    const store = makeStore({ commitReservation, voidReservation } as never, 'fail-open');

    const commit = await store.commit('optimistic:u1:1000', 5);
    const voided = await store.void('optimistic:u1:1000');

    expect(commit).toEqual({ committed: 0, released: 0, balance: 0 });
    expect(voided).toEqual({ released: 0, balance: 0 });
    expect(commitReservation).not.toHaveBeenCalled();
    expect(voidReservation).not.toHaveBeenCalled();
  });

  it('getBalance falls back to the stale cached value on outage', async () => {
    let clock = 0;
    const getBalance = vi
      .fn()
      .mockResolvedValueOnce({ userId: 'u1', balance: 50 })
      .mockRejectedValueOnce(new NetworkError('down'));
    const config = resolveConfig({
      baseUrl: 'https://api.test',
      fallback: 'fail-open',
      fetch: vi.fn() as unknown as typeof fetch,
      now: () => clock,
      cache: { balanceTtlMs: 1000 },
    });
    const store = new HostedWalletStore({ getBalance } as never, config);

    // first call populates the cache
    const first = await store.getBalance('u1');
    expect(first.balance).toBe(50);

    // expire the cache, then the network fails → serve stale
    clock = 5000;
    const stale = await store.getBalance('u1');
    expect(stale.balance).toBe(50);
    expect(getBalance).toHaveBeenCalledTimes(2);
  });

  it('getBalance rethrows on outage when no cached value exists', async () => {
    const getBalance = vi.fn().mockRejectedValue(new NetworkError('down'));
    const store = makeStore({ getBalance } as never, 'fail-open');

    await expect(store.getBalance('u1')).rejects.toBeInstanceOf(NetworkError);
  });
});
