import { BalanceCache } from '../cache/balance-cache';
import type { ResolvedConfig } from '../config';
import { CircuitOpenError, InsufficientCreditsError, NetworkError } from '../errors';
import type { MonetizationClient } from '../monetization-client';
import type {
  Balance,
  CommitResult,
  Estimate,
  EstimateInput,
  EstimateResult,
  GrantKind,
  Reservation,
  VoidResult,
} from '../types';
import type { WalletStore } from './wallet-store';

/** Reservations minted by the fail-open path carry this id prefix so commit/void no-op. */
const OPTIMISTIC_PREFIX = 'optimistic:';

function isOutage(error: unknown): boolean {
  return error instanceof CircuitOpenError || error instanceof NetworkError;
}

/**
 * Talks to the live SaaS via MonetizationClient and layers the resilience
 * contract on top (docs/design/02-resilience.md):
 *
 * - balance reads served from a short TTL cache; stale value used on outage
 * - the reserve gate honours the configured fallback policy when the SaaS is
 *   unreachable (fail-open mints an optimistic zero-hold; fail-closed rethrows)
 * - InsufficientCredits is a business answer, never a fallback trigger
 * - commit/void/grant always hit the API; their failures surface for the
 *   reconcile path rather than being silently faked
 */
export class HostedWalletStore implements WalletStore {
  private readonly cache: BalanceCache;

  constructor(
    private readonly client: MonetizationClient,
    private readonly config: ResolvedConfig,
  ) {
    this.cache = new BalanceCache(config.cache.balanceTtlMs, config.now);
  }

  async reserve(userId: string, operation: string, estimate?: Estimate): Promise<Reservation> {
    try {
      const reservation = await this.client.createReservation({ userId, operation, estimate });
      this.cache.set(userId, this.toBalance(userId, reservation.balance));
      return reservation;
    } catch (error) {
      if (error instanceof InsufficientCreditsError) throw error;
      if (isOutage(error) && this.config.fallback === 'fail-open') {
        return this.optimisticReservation(userId);
      }
      throw error;
    }
  }

  async commit(reservationId: string, actualUnits?: number): Promise<CommitResult> {
    if (reservationId.startsWith(OPTIMISTIC_PREFIX)) {
      // Nothing was held; reconciliation will settle real usage later.
      return { committed: 0, released: 0, balance: 0 };
    }
    const input = actualUnits === undefined ? {} : { actualUnits };
    return this.client.commitReservation(reservationId, input);
  }

  async void(reservationId: string): Promise<VoidResult> {
    if (reservationId.startsWith(OPTIMISTIC_PREFIX)) {
      return { released: 0, balance: 0 };
    }
    return this.client.voidReservation(reservationId);
  }

  async grant(
    userId: string,
    amount: number,
    kind: GrantKind,
    referenceId?: string,
  ): Promise<Balance> {
    const balance = await this.client.grant({ userId, amount, kind, referenceId });
    this.cache.set(userId, balance);
    return balance;
  }

  async getBalance(userId: string): Promise<Balance> {
    const fresh = this.cache.get(userId);
    if (fresh) return fresh;

    try {
      const balance = await this.client.getBalance(userId);
      this.cache.set(userId, balance);
      return balance;
    } catch (error) {
      const stale = this.cache.getStale(userId);
      if (isOutage(error) && stale) return stale;
      throw error;
    }
  }

  async estimate(input: EstimateInput): Promise<EstimateResult> {
    return this.client.estimate(input);
  }

  private optimisticReservation(userId: string): Reservation {
    const stale = this.cache.getStale(userId);
    const ttlMs = this.config.cache.balanceTtlMs;
    return {
      reservationId: `${OPTIMISTIC_PREFIX}${userId}:${this.config.now()}`,
      heldAmount: 0,
      balance: stale?.balance ?? 0,
      expiresAt: new Date(this.config.now() + Math.max(ttlMs, 60_000)).toISOString(),
    };
  }

  private toBalance(userId: string, balance: number): Balance {
    return { userId, balance };
  }
}
