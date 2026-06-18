import type { CircuitBreakerConfig } from '../config';

export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Rolling-window circuit breaker (docs/design/02-resilience.md §2).
 *
 * Trips to `open` when the failure rate over the last `volumeThreshold` calls
 * exceeds `errorThresholdPercent`. After `openMs` it moves to `half-open` and
 * lets a single trial through; success closes it, failure re-opens it.
 *
 * Pure and clock-injectable so it is deterministic under test.
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private openedAt = 0;
  private readonly window: boolean[] = [];
  private readonly threshold: number;
  private readonly openMs: number;
  private readonly volume: number;

  constructor(
    config: Required<CircuitBreakerConfig>,
    private readonly now: () => number = Date.now,
  ) {
    this.threshold = config.errorThresholdPercent;
    this.openMs = config.openMs;
    this.volume = config.volumeThreshold;
  }

  /** Whether a call may proceed right now (advances open → half-open on timeout). */
  canPass(): boolean {
    if (this.state === 'open') {
      if (this.now() - this.openedAt >= this.openMs) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return true;
  }

  getState(): CircuitState {
    return this.state;
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.reset();
      return;
    }
    this.push(true);
  }

  recordFailure(): void {
    if (this.state === 'half-open') {
      this.trip();
      return;
    }
    this.push(false);
    this.evaluate();
  }

  private push(ok: boolean): void {
    this.window.push(ok);
    if (this.window.length > this.volume) this.window.shift();
  }

  private evaluate(): void {
    if (this.window.length < this.volume) return;
    const failures = this.window.filter((ok) => !ok).length;
    const failurePct = (failures / this.window.length) * 100;
    if (failurePct >= this.threshold) this.trip();
  }

  private trip(): void {
    this.state = 'open';
    this.openedAt = this.now();
    this.window.length = 0;
  }

  private reset(): void {
    this.state = 'closed';
    this.window.length = 0;
  }
}
