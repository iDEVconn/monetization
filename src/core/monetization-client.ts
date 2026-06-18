import type { ResolvedConfig } from './config';
import { HttpClient } from './http-client';
import type {
  Balance,
  CommitReservationInput,
  CommitResult,
  CreateReservationInput,
  CreditLedgerPage,
  Entitlements,
  EstimateInput,
  EstimateResult,
  GrantInput,
  PageParams,
  PricingRule,
  ReconcileResult,
  RecordSaleInput,
  RecordSaleResult,
  Reservation,
  RevenueBalance,
  RevenueLedgerPage,
  VoidResult,
} from './types';

/** Generate an idempotency key when the caller does not supply one. */
function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Typed, one-method-per-endpoint wrapper over the SaaS wallet API
 * (docs/design/openapi.yaml). Transport, auth, retry, and error mapping are
 * delegated to HttpClient; this class only knows paths and shapes.
 */
export class MonetizationClient {
  private readonly http: HttpClient;

  constructor(config: ResolvedConfig) {
    this.http = new HttpClient(config);
  }

  getCircuitState() {
    return this.http.getCircuitState();
  }

  // ── Credits: reservations ──────────────────────────────────────────────────

  async createReservation(
    input: CreateReservationInput,
    idempotencyKey: string = newIdempotencyKey(),
  ): Promise<Reservation> {
    const { data } = await this.http.request<Reservation>('/credits/reservations', {
      method: 'POST',
      body: input,
      idempotencyKey,
    });
    return data;
  }

  async commitReservation(
    reservationId: string,
    input: CommitReservationInput = {},
    idempotencyKey: string = newIdempotencyKey(),
  ): Promise<CommitResult> {
    const { data } = await this.http.request<CommitResult>(
      `/credits/reservations/${encodeURIComponent(reservationId)}/commit`,
      { method: 'POST', body: input, idempotencyKey },
    );
    return data;
  }

  async voidReservation(
    reservationId: string,
    idempotencyKey: string = newIdempotencyKey(),
  ): Promise<VoidResult> {
    const { data } = await this.http.request<VoidResult>(
      `/credits/reservations/${encodeURIComponent(reservationId)}/void`,
      { method: 'POST', idempotencyKey },
    );
    return data;
  }

  // ── Credits: grant, balance, ledger, reconcile, estimate ────────────────────

  async grant(input: GrantInput, idempotencyKey: string = newIdempotencyKey()): Promise<Balance> {
    const { data } = await this.http.request<Balance>('/credits/grant', {
      method: 'POST',
      body: input,
      idempotencyKey,
    });
    return data;
  }

  async getBalance(userId: string): Promise<Balance> {
    const { data } = await this.http.request<Balance>(
      `/credits/balance/${encodeURIComponent(userId)}`,
    );
    return data;
  }

  async getCreditLedger(userId: string, page: PageParams = {}): Promise<CreditLedgerPage> {
    const { data } = await this.http.request<CreditLedgerPage>(
      `/credits/ledger/${encodeURIComponent(userId)}`,
      { query: { limit: page.limit, offset: page.offset } },
    );
    return data;
  }

  async reconcile(userId: string): Promise<ReconcileResult> {
    const { data } = await this.http.request<ReconcileResult>('/credits/reconcile', {
      method: 'POST',
      body: { userId },
    });
    return data;
  }

  async estimate(input: EstimateInput): Promise<EstimateResult> {
    const { data } = await this.http.request<EstimateResult>('/credits/estimate', {
      method: 'POST',
      body: input,
    });
    return data;
  }

  // ── Pricing ─────────────────────────────────────────────────────────────────

  async listPricing(): Promise<PricingRule[]> {
    const { data } = await this.http.request<PricingRule[] | { operations: PricingRule[] }>(
      '/pricing/operations',
    );
    return Array.isArray(data) ? data : data.operations;
  }

  // ── Revenue ───────────────────────────────────────────────────────────────────

  async recordSale(
    input: RecordSaleInput,
    idempotencyKey: string = newIdempotencyKey(),
  ): Promise<RecordSaleResult> {
    const { data } = await this.http.request<RecordSaleResult>('/revenue/record-sale', {
      method: 'POST',
      body: input,
      idempotencyKey,
    });
    return data;
  }

  async markSaleAvailable(
    referenceId: string,
    idempotencyKey: string = newIdempotencyKey(),
  ): Promise<RecordSaleResult> {
    const { data } = await this.http.request<RecordSaleResult>('/revenue/mark-available', {
      method: 'POST',
      body: { referenceId },
      idempotencyKey,
    });
    return data;
  }

  async getRevenueBalance(userId: string): Promise<RevenueBalance> {
    const { data } = await this.http.request<RevenueBalance>(
      `/revenue/balance/${encodeURIComponent(userId)}`,
    );
    return data;
  }

  async getRevenueLedger(userId: string, page: PageParams = {}): Promise<RevenueLedgerPage> {
    const { data } = await this.http.request<RevenueLedgerPage>(
      `/revenue/ledger/${encodeURIComponent(userId)}`,
      { query: { limit: page.limit, offset: page.offset } },
    );
    return data;
  }

  // ── Entitlements (ETag-aware) ───────────────────────────────────────────────

  async getEntitlements(userId: string, etag?: string): Promise<Entitlements | null> {
    const { data, etag: responseEtag, notModified } = await this.http.request<Entitlements>(
      `/entitlements/${encodeURIComponent(userId)}`,
      { etag },
    );
    if (notModified) return null;
    return { ...data, etag: responseEtag };
  }
}
