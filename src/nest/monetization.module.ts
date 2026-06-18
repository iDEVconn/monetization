import { type DynamicModule, Global, Module, type Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import {
  createMonetizationCore,
  type MonetizationCore,
  type MonetizationClient,
  type WalletStore,
} from '@idevconn/monetization/core';
import { CreditWalletClient } from './clients/credit-wallet.client';
import { EntitlementsClient } from './clients/entitlements.client';
import { PricingClient } from './clients/pricing.client';
import { RevenueWalletClient } from './clients/revenue-wallet.client';
import { CreditConsumeInterceptor } from './interceptors/credit-consume.interceptor';
import { InMemoryJobRegistry } from './job-registry/job-registry';
import { JobLifecycleService } from './job-lifecycle.service';
import {
  JOB_REGISTRY,
  MONETIZATION_CLIENT,
  MONETIZATION_CORE,
  MONETIZATION_OPTIONS,
  WALLET_STORE,
} from './monetization.constants';
import {
  DEFAULT_BASE_URL,
  type MonetizationModuleAsyncOptions,
  type MonetizationModuleOptions,
  type MonetizationOptionsFactory,
} from './monetization.options';

function buildCore(options: MonetizationModuleOptions): MonetizationCore {
  if (options.mode && options.mode !== 'hosted') {
    throw new Error(
      `MonetizationModule: mode '${options.mode}' is not implemented yet — use 'hosted'.`,
    );
  }
  return createMonetizationCore({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    fallback: options.fallback,
    cache: options.cache,
    circuitBreaker: options.circuitBreaker,
    retry: options.retry,
  });
}

const SHARED_PROVIDERS: Provider[] = [
  {
    provide: MONETIZATION_CORE,
    useFactory: (options: MonetizationModuleOptions) => buildCore(options),
    inject: [MONETIZATION_OPTIONS],
  },
  {
    provide: MONETIZATION_CLIENT,
    useFactory: (core: MonetizationCore): MonetizationClient => core.client,
    inject: [MONETIZATION_CORE],
  },
  {
    provide: WALLET_STORE,
    useFactory: (core: MonetizationCore): WalletStore => core.store,
    inject: [MONETIZATION_CORE],
  },
  {
    provide: JOB_REGISTRY,
    useFactory: (options: MonetizationModuleOptions) =>
      new InMemoryJobRegistry(options.jobMappingTtlMs ?? 3_600_000),
    inject: [MONETIZATION_OPTIONS],
  },
  CreditWalletClient,
  RevenueWalletClient,
  EntitlementsClient,
  PricingClient,
  JobLifecycleService,
  CreditConsumeInterceptor,
  { provide: APP_INTERCEPTOR, useExisting: CreditConsumeInterceptor },
];

const EXPORTED = [
  CreditWalletClient,
  RevenueWalletClient,
  EntitlementsClient,
  PricingClient,
  JobLifecycleService,
  WALLET_STORE,
  MONETIZATION_CLIENT,
  JOB_REGISTRY,
];

/**
 * One import wires the whole SaaS monetization surface: typed clients, the
 * global credit-consume interceptor, and the job-settlement service. Global, so
 * the clients are injectable anywhere without re-importing.
 */
@Global()
@Module({})
export class MonetizationModule {
  static forRoot(options: MonetizationModuleOptions): DynamicModule {
    return {
      module: MonetizationModule,
      providers: [{ provide: MONETIZATION_OPTIONS, useValue: options }, ...SHARED_PROVIDERS],
      exports: EXPORTED,
    };
  }

  static forRootAsync(async: MonetizationModuleAsyncOptions): DynamicModule {
    return {
      module: MonetizationModule,
      imports: async.imports ?? [],
      providers: [...this.asyncOptionsProviders(async), ...SHARED_PROVIDERS],
      exports: EXPORTED,
    };
  }

  private static asyncOptionsProviders(async: MonetizationModuleAsyncOptions): Provider[] {
    if (async.useFactory) {
      return [
        {
          provide: MONETIZATION_OPTIONS,
          useFactory: async.useFactory,
          inject: (async.inject ?? []) as never[],
        },
      ];
    }

    const injectClass = async.useExisting ?? async.useClass;
    if (!injectClass) {
      throw new Error('MonetizationModule.forRootAsync requires useFactory, useClass, or useExisting.');
    }

    const providers: Provider[] = [
      {
        provide: MONETIZATION_OPTIONS,
        useFactory: (factory: MonetizationOptionsFactory) => factory.createMonetizationOptions(),
        inject: [injectClass],
      },
    ];
    if (async.useClass) {
      providers.push({ provide: async.useClass, useClass: async.useClass });
    }
    return providers;
  }
}
