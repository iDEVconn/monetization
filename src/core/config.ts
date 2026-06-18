/**
 * Configuration surface for the /core client.
 *
 * Mirrors the resilience contract in docs/design/02-resilience.md: cache,
 * circuit breaker, and a configurable fallback policy for when the SaaS is
 * unreachable.
 */

/** Behaviour when the SaaS wallet is unreachable (breaker open / network down). */
export type FallbackPolicy =
  /** Allow the operation through with a zero-cost optimistic hold. Favours UX. */
  | 'fail-open'
  /** Reject the operation. Favours revenue protection. */
  | 'fail-closed';

export interface CacheConfig {
  /** How long a fetched balance stays fresh, in ms. Default 10_000. */
  balanceTtlMs?: number;
}

export interface CircuitBreakerConfig {
  /** Open the breaker once this % of recent calls fail. Default 50. */
  errorThresholdPercent?: number;
  /** How long the breaker stays open before a half-open trial, in ms. Default 30_000. */
  openMs?: number;
  /** Minimum calls in the rolling window before the breaker can trip. Default 5. */
  volumeThreshold?: number;
}

export interface RetryConfig {
  /** Max retry attempts for idempotent/safe requests. Default 2. */
  maxRetries?: number;
  /** Base backoff in ms (exponential). Default 200. */
  baseDelayMs?: number;
}

export interface CoreClientConfig {
  /** Server-to-server API key (X-Api-Key). Required for backend usage. */
  apiKey?: string;
  /** Short-lived bearer user token for read-only frontend access. */
  getUserToken?: () => string | Promise<string>;
  /** Base URL of the SaaS API, e.g. https://isubscribe.me/api/v1/public. */
  baseUrl: string;
  /** Request timeout in ms. Default 10_000. */
  timeoutMs?: number;
  fallback?: FallbackPolicy;
  cache?: CacheConfig;
  circuitBreaker?: CircuitBreakerConfig;
  retry?: RetryConfig;
  /** Injectable fetch (tests / non-global-fetch runtimes). Defaults to globalThis.fetch. */
  fetch?: typeof fetch;
  /** Optional clock injection for deterministic tests. Defaults to Date.now. */
  now?: () => number;
}

export interface ResolvedConfig {
  apiKey?: string;
  getUserToken?: () => string | Promise<string>;
  baseUrl: string;
  timeoutMs: number;
  fallback: FallbackPolicy;
  cache: Required<CacheConfig>;
  circuitBreaker: Required<CircuitBreakerConfig>;
  retry: Required<RetryConfig>;
  fetch: typeof fetch;
  now: () => number;
}

export function resolveConfig(config: CoreClientConfig): ResolvedConfig {
  const fetchImpl = config.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error(
      'No fetch implementation available. Pass `fetch` in the config or run on Node >= 18.',
    );
  }
  return {
    apiKey: config.apiKey,
    getUserToken: config.getUserToken,
    baseUrl: config.baseUrl.replace(/\/+$/, ''),
    timeoutMs: config.timeoutMs ?? 10_000,
    fallback: config.fallback ?? 'fail-closed',
    cache: { balanceTtlMs: config.cache?.balanceTtlMs ?? 10_000 },
    circuitBreaker: {
      errorThresholdPercent: config.circuitBreaker?.errorThresholdPercent ?? 50,
      openMs: config.circuitBreaker?.openMs ?? 30_000,
      volumeThreshold: config.circuitBreaker?.volumeThreshold ?? 5,
    },
    retry: {
      maxRetries: config.retry?.maxRetries ?? 2,
      baseDelayMs: config.retry?.baseDelayMs ?? 200,
    },
    fetch: fetchImpl,
    now: config.now ?? Date.now,
  };
}
