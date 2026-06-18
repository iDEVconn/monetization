/**
 * @idevconn/monetization/nest
 *
 * NestJS surface: one module import, one `@ConsumesCredits` decorator per AI
 * endpoint, and injectable wallet/revenue/entitlements/pricing clients. Depends
 * on /core; @nestjs/* and rxjs are peer dependencies.
 */

export { MonetizationModule } from './monetization.module';
export {
  ConsumesCredits,
  type ConsumesCreditsMetadata,
  type ConsumesCreditsOptions,
} from './decorators/consumes-credits.decorator';
export { CreditConsumeInterceptor } from './interceptors/credit-consume.interceptor';

export { CreditWalletClient } from './clients/credit-wallet.client';
export { RevenueWalletClient } from './clients/revenue-wallet.client';
export { EntitlementsClient } from './clients/entitlements.client';
export { PricingClient } from './clients/pricing.client';

export { JobLifecycleService } from './job-lifecycle.service';
export { InMemoryJobRegistry, type JobRegistry } from './job-registry/job-registry';

export {
  CONSUMES_CREDITS,
  JOB_REGISTRY,
  MONETIZATION_CLIENT,
  MONETIZATION_CORE,
  MONETIZATION_OPTIONS,
  WALLET_STORE,
} from './monetization.constants';

export {
  DEFAULT_BASE_URL,
  type MonetizationMode,
  type MonetizationModuleAsyncOptions,
  type MonetizationModuleOptions,
  type MonetizationOptionsFactory,
} from './monetization.options';

// Re-export the core types consumers need when typing handlers/clients.
export type {
  Balance,
  CommitResult,
  CreditLedgerPage,
  Entitlements,
  Estimate,
  EstimateResult,
  GrantKind,
  PricingRule,
  Reservation,
  RevenueBalance,
  VoidResult,
} from '@idevconn/monetization/core';
