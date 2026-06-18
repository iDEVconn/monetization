/**
 * @idevconn/monetization/core
 *
 * Transport-agnostic client for the iSubscribe monetization platform. No NestJS
 * or React dependency — the same code powers the backend module, the React
 * provider, and the migration CLI.
 */

import { type CoreClientConfig, resolveConfig } from './config';
import { MonetizationClient } from './monetization-client';
import { HostedWalletStore } from './store/hosted-wallet-store';
import type { WalletStore } from './store/wallet-store';

export interface MonetizationCore {
  client: MonetizationClient;
  store: WalletStore;
}

/**
 * Wire a hosted-mode core from config. Returns the low-level typed `client`
 * (one method per endpoint) and the resilience-wrapped `store` (the interface
 * the /nest and /react layers consume).
 */
export function createMonetizationCore(config: CoreClientConfig): MonetizationCore {
  const resolved = resolveConfig(config);
  const client = new MonetizationClient(resolved);
  const store = new HostedWalletStore(client, resolved);
  return { client, store };
}

export { resolveConfig } from './config';
export type {
  CacheConfig,
  CircuitBreakerConfig,
  CoreClientConfig,
  FallbackPolicy,
  ResolvedConfig,
  RetryConfig,
} from './config';

export { MonetizationClient } from './monetization-client';
export { HostedWalletStore } from './store/hosted-wallet-store';
export type { WalletStore } from './store/wallet-store';

export { BalanceCache } from './cache/balance-cache';
export { CircuitBreaker } from './resilience/circuit-breaker';
export type { CircuitState } from './resilience/circuit-breaker';

export { HttpClient } from './http-client';
export type { HttpResponse, RequestOptions } from './http-client';

export {
  ApiError,
  CircuitOpenError,
  IdempotencyConflictError,
  InsufficientCreditsError,
  MonetizationError,
  NetworkError,
  NotFoundError,
  ReservationExpiredError,
} from './errors';

export type * from './types';
