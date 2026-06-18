import type { Balance } from '../types';

interface Entry {
  value: Balance;
  expiresAt: number;
}

/**
 * Per-user TTL cache for credit balances (docs/design/02-resilience.md §1).
 *
 * Serves a recent balance to the read path (UX meters, gate pre-checks) without
 * hammering the SaaS, and provides a last-known value for the fallback path
 * when the API is unreachable. Authoritative writes (reserve/commit) always go
 * to the API and update the cache on the way back.
 */
export class BalanceCache {
  private readonly store = new Map<string, Entry>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Fresh value if not expired, otherwise undefined. */
  get(userId: string): Balance | undefined {
    const entry = this.store.get(userId);
    if (!entry) return undefined;
    if (this.now() >= entry.expiresAt) return undefined;
    return entry.value;
  }

  /** Last known value regardless of freshness — for the fallback path only. */
  getStale(userId: string): Balance | undefined {
    return this.store.get(userId)?.value;
  }

  set(userId: string, value: Balance): void {
    this.store.set(userId, { value, expiresAt: this.now() + this.ttlMs });
  }

  invalidate(userId: string): void {
    this.store.delete(userId);
  }

  clear(): void {
    this.store.clear();
  }
}
