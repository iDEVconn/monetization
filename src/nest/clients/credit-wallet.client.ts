import { Inject, Injectable } from '@nestjs/common';

import type {
  Balance,
  CommitResult,
  CreditLedgerPage,
  Estimate,
  EstimateInput,
  EstimateResult,
  GrantKind,
  MonetizationClient,
  PageParams,
  ReconcileResult,
  Reservation,
  VoidResult,
  WalletStore,
} from '@idevconn/monetization/core';
import { MONETIZATION_CLIENT, WALLET_STORE } from '../monetization.constants';

/**
 * Injectable credit-wallet facade. Reserve/commit/void/balance/grant/estimate go
 * through the resilience-wrapped WalletStore; ledger and reconcile (read/admin
 * paths with no fallback semantics) call the raw client.
 */
@Injectable()
export class CreditWalletClient {
  constructor(
    @Inject(WALLET_STORE) private readonly store: WalletStore,
    @Inject(MONETIZATION_CLIENT) private readonly client: MonetizationClient,
  ) {}

  reserve(userId: string, operation: string, estimate?: Estimate): Promise<Reservation> {
    return this.store.reserve(userId, operation, estimate);
  }

  commit(reservationId: string, actualUnits?: number): Promise<CommitResult> {
    return this.store.commit(reservationId, actualUnits);
  }

  void(reservationId: string): Promise<VoidResult> {
    return this.store.void(reservationId);
  }

  grant(userId: string, amount: number, kind: GrantKind, referenceId?: string): Promise<Balance> {
    return this.store.grant(userId, amount, kind, referenceId);
  }

  getBalance(userId: string): Promise<Balance> {
    return this.store.getBalance(userId);
  }

  estimate(input: EstimateInput): Promise<EstimateResult> {
    return this.store.estimate(input);
  }

  getLedger(userId: string, page?: PageParams): Promise<CreditLedgerPage> {
    return this.client.getCreditLedger(userId, page);
  }

  reconcile(userId: string): Promise<ReconcileResult> {
    return this.client.reconcile(userId);
  }
}
