/**
 * Domain types for the iSubscribe monetization platform.
 *
 * These mirror the public SaaS API contract (docs/design/openapi.yaml in the
 * iSubscription repo). They are the single shared vocabulary used by the HTTP
 * client, the WalletStore implementations, and the higher-level /nest and
 * /react layers.
 *
 * Money/credit amounts are plain numbers in the smallest tracked unit
 * (credits for wallets, currency minor units for revenue) as returned by the API.
 */

// ── Credits: reservations (two-phase consumption) ────────────────────────────

/** Sizing hints used to compute the hold for per-unit operations. */
export interface Estimate {
  durationMinutes?: number;
  quantity?: number;
}

export interface CreateReservationInput {
  userId: string;
  operation: string;
  estimate?: Estimate;
}

export interface Reservation {
  reservationId: string;
  heldAmount: number;
  balance: number;
  expiresAt: string;
  pricingVersion?: string;
}

export interface CommitReservationInput {
  /** Measured units (e.g. minutes) for per-unit pricing. Omit to charge the held amount. */
  actualUnits?: number;
}

export interface CommitResult {
  committed: number;
  released: number;
  balance: number;
}

export interface VoidResult {
  released: number;
  balance: number;
}

// ── Credits: grants, balance, ledger ─────────────────────────────────────────

export type GrantKind =
  | 'monthly_grant'
  | 'plan_upgrade_grant'
  | 'addon_purchase'
  | 'admin_adjustment';

export interface GrantInput {
  userId: string;
  amount: number;
  kind: GrantKind;
  referenceId?: string;
}

export interface Balance {
  userId: string;
  balance: number;
  lifetimeEarned?: number;
  lifetimeSpent?: number;
  lastGrantAt?: string | null;
}

export interface CreditLedgerEntry {
  id: string;
  kind: string;
  amount: number;
  balanceAfter: number;
  referenceId?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface CreditLedgerPage {
  total: number;
  entries: CreditLedgerEntry[];
}

export interface ReconcileResult {
  grantsApplied: number;
  balance: number;
}

// ── Pricing + estimate ───────────────────────────────────────────────────────

export interface PricingRule {
  operation: string;
  rule: {
    flat?: number;
    perMinute?: number;
    quality?: Record<string, number>;
  };
  version?: string;
}

export interface EstimateInput {
  userId: string;
  operation: string;
  durationMinutes?: number;
  quantity?: number;
}

export interface EstimateResult {
  requiredCredits: number;
  balance: number;
  sufficient: boolean;
  pricingVersion?: string;
}

// ── Revenue (sellers) ─────────────────────────────────────────────────────────

export interface RecordSaleInput {
  sellerId: string;
  grossAmount: number;
  feePercent: number;
  currency?: string;
  referenceId: string;
}

export interface RecordSaleResult {
  netAmount: number;
  fee: number;
  pendingPayout: number;
}

export interface RevenueBalance {
  userId: string;
  balance: number;
  pendingPayout: number;
  lifetimeEarned: number;
  lifetimePaid: number;
}

export interface RevenueLedgerEntry {
  id: string;
  kind: string;
  amount: number;
  balanceAfter: number;
  referenceId?: string | null;
  availableAt?: string | null;
  createdAt: string;
}

export interface RevenueLedgerPage {
  total: number;
  entries: RevenueLedgerEntry[];
}

// ── Entitlements ───────────────────────────────────────────────────────────────

export interface Entitlements {
  plan?: { code: string; name: string } | null;
  credits?: { balance: number; monthlyGrant: number };
  features?: Record<string, boolean>;
  limits?: Record<string, number>;
  quality?: Record<string, unknown>;
  /** ETag returned by the API; used for conditional requests. */
  etag?: string;
}

// ── Pagination ─────────────────────────────────────────────────────────────────

export interface PageParams {
  limit?: number;
  offset?: number;
}
