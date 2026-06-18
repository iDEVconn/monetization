/**
 * Maps a dispatched job id to the reservation it must settle. The
 * CreditConsumeInterceptor writes the mapping at reserve time; the BullMQ
 * lifecycle reads it to commit (on completion) or void (on failure).
 *
 * The in-memory default works for single-process apps and tests. Multi-process
 * deployments (API + separate worker) should provide a Redis-backed
 * implementation under the same token — see the module's `JOB_REGISTRY` provider.
 */
export interface JobRegistry {
  set(jobId: string, reservationId: string): Promise<void>;
  /** Returns and removes the mapping (settlement is once-only). */
  take(jobId: string): Promise<string | undefined>;
}

interface Entry {
  reservationId: string;
  expiresAt: number;
}

export class InMemoryJobRegistry implements JobRegistry {
  private readonly store = new Map<string, Entry>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  async set(jobId: string, reservationId: string): Promise<void> {
    this.sweep();
    this.store.set(jobId, { reservationId, expiresAt: this.now() + this.ttlMs });
  }

  async take(jobId: string): Promise<string | undefined> {
    const entry = this.store.get(jobId);
    if (!entry) return undefined;
    this.store.delete(jobId);
    if (this.now() >= entry.expiresAt) return undefined;
    return entry.reservationId;
  }

  private sweep(): void {
    const now = this.now();
    for (const [jobId, entry] of this.store) {
      if (now >= entry.expiresAt) this.store.delete(jobId);
    }
  }
}
