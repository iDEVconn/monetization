import type {
  Balance,
  CommitResult,
  Estimate,
  EstimateInput,
  EstimateResult,
  GrantKind,
  Reservation,
  VoidResult,
} from '../types';

/**
 * The single interface the /nest decorator and /react hooks depend on. Swapping
 * `mode` (hosted | local | hybrid) swaps the implementation behind this contract
 * without touching any consumer code (docs/design/03-sdk-nest.md §"Mode Strategy").
 *
 * Phase 1 ships HostedWalletStore only; local/hybrid land in the migration phase.
 *
 * Note: getBalance returns the full Balance object (not just a number as in the
 * original RFC sketch) so the read-path hooks get lifetime stats for free.
 */
export interface WalletStore {
  reserve(userId: string, operation: string, estimate?: Estimate): Promise<Reservation>;
  commit(reservationId: string, actualUnits?: number): Promise<CommitResult>;
  void(reservationId: string): Promise<VoidResult>;
  grant(userId: string, amount: number, kind: GrantKind, referenceId?: string): Promise<Balance>;
  getBalance(userId: string): Promise<Balance>;
  estimate(input: EstimateInput): Promise<EstimateResult>;
}
