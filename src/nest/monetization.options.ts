import type { ModuleMetadata, Type } from '@nestjs/common';

import type {
  CacheConfig,
  CircuitBreakerConfig,
  FallbackPolicy,
  RetryConfig,
} from '@idevconn/monetization/core';

/** Wallet backend the module talks to. Phase 1 ships `hosted` only. */
export type MonetizationMode = 'hosted' | 'local' | 'hybrid';

export interface MonetizationModuleOptions {
  apiKey: string;
  /** SaaS base URL, e.g. https://api.isubscribe.me/api/v1. Defaults to prod. */
  baseUrl?: string;
  mode?: MonetizationMode;
  fallback?: FallbackPolicy;
  cache?: CacheConfig;
  circuitBreaker?: CircuitBreakerConfig;
  retry?: RetryConfig;
  /** Names of BullMQ queues whose job completion/failure settle reservations. */
  bullmq?: { queues: string[] };
  /**
   * How long a jobId → reservationId mapping is retained, in ms. Should match or
   * exceed the SaaS reservation TTL. Default 3_600_000 (1h).
   */
  jobMappingTtlMs?: number;
}

/** Default production API base. */
export const DEFAULT_BASE_URL = 'https://api.isubscribe.me/api/v1';

export interface MonetizationOptionsFactory {
  createMonetizationOptions():
    | Promise<MonetizationModuleOptions>
    | MonetizationModuleOptions;
}

export interface MonetizationModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: never[]
  ) => Promise<MonetizationModuleOptions> | MonetizationModuleOptions;
  inject?: unknown[];
  useClass?: Type<MonetizationOptionsFactory>;
  useExisting?: Type<MonetizationOptionsFactory>;
}
