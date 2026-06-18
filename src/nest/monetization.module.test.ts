import 'reflect-metadata';

import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { CreditWalletClient } from './clients/credit-wallet.client';
import { EntitlementsClient } from './clients/entitlements.client';
import { PricingClient } from './clients/pricing.client';
import { RevenueWalletClient } from './clients/revenue-wallet.client';
import { JobLifecycleService } from './job-lifecycle.service';
import { MonetizationModule } from './monetization.module';
import { MONETIZATION_CLIENT, WALLET_STORE } from './monetization.constants';

describe('MonetizationModule', () => {
  it('forRoot wires all injectable clients and the core', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        MonetizationModule.forRoot({
          apiKey: 'test-key',
          baseUrl: 'https://api.test/api/v1',
        }),
      ],
    }).compile();

    expect(moduleRef.get(CreditWalletClient)).toBeInstanceOf(CreditWalletClient);
    expect(moduleRef.get(RevenueWalletClient)).toBeInstanceOf(RevenueWalletClient);
    expect(moduleRef.get(EntitlementsClient)).toBeInstanceOf(EntitlementsClient);
    expect(moduleRef.get(PricingClient)).toBeInstanceOf(PricingClient);
    expect(moduleRef.get(JobLifecycleService)).toBeInstanceOf(JobLifecycleService);
    expect(moduleRef.get(MONETIZATION_CLIENT)).toBeDefined();
    expect(moduleRef.get(WALLET_STORE)).toBeDefined();
  });

  it('forRootAsync resolves options via useFactory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        MonetizationModule.forRootAsync({
          useFactory: () => ({ apiKey: 'async-key', baseUrl: 'https://api.test/api/v1' }),
        }),
      ],
    }).compile();

    expect(moduleRef.get(CreditWalletClient)).toBeInstanceOf(CreditWalletClient);
  });

  it('rejects an unimplemented mode', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          MonetizationModule.forRoot({ apiKey: 'k', baseUrl: 'https://x', mode: 'local' }),
        ],
      }).compile(),
    ).rejects.toThrow(/mode 'local' is not implemented/);
  });
});
