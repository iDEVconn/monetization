import { Inject, Injectable } from '@nestjs/common';

import type { MonetizationClient, PricingRule } from '@idevconn/monetization/core';
import { MONETIZATION_CLIENT } from '../monetization.constants';

/** Injectable pricing facade — the single source of truth lives in the SaaS. */
@Injectable()
export class PricingClient {
  constructor(@Inject(MONETIZATION_CLIENT) private readonly client: MonetizationClient) {}

  listOperations(): Promise<PricingRule[]> {
    return this.client.listPricing();
  }
}
