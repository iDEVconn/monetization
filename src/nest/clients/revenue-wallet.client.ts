import { Inject, Injectable } from '@nestjs/common';

import type {
  MonetizationClient,
  PageParams,
  RecordSaleInput,
  RecordSaleResult,
  RevenueBalance,
  RevenueLedgerPage,
} from '@idevconn/monetization/core';
import { MONETIZATION_CLIENT } from '../monetization.constants';

/** Injectable revenue-wallet facade for seller flows (marketplace sales, payouts). */
@Injectable()
export class RevenueWalletClient {
  constructor(@Inject(MONETIZATION_CLIENT) private readonly client: MonetizationClient) {}

  recordSale(input: RecordSaleInput): Promise<RecordSaleResult> {
    return this.client.recordSale(input);
  }

  markAvailable(sellerId: string, referenceId: string): Promise<RecordSaleResult> {
    return this.client.markSaleAvailable(sellerId, referenceId);
  }

  getBalance(userId: string): Promise<RevenueBalance> {
    return this.client.getRevenueBalance(userId);
  }

  getLedger(userId: string, page?: PageParams): Promise<RevenueLedgerPage> {
    return this.client.getRevenueLedger(userId, page);
  }
}
