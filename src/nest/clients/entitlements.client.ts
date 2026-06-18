import { Inject, Injectable } from '@nestjs/common';

import type { Entitlements, MonetizationClient } from '@idevconn/monetization/core';
import { MONETIZATION_CLIENT } from '../monetization.constants';

/** Injectable entitlements facade (resolved plan/features/limits/fees for a user). */
@Injectable()
export class EntitlementsClient {
  constructor(@Inject(MONETIZATION_CLIENT) private readonly client: MonetizationClient) {}

  /** Returns the entitlement set, or null if a conditional request was not modified. */
  get(userId: string, etag?: string): Promise<Entitlements | null> {
    return this.client.getEntitlements(userId, etag);
  }
}
