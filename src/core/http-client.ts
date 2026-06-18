import type { ResolvedConfig } from './config';
import { CircuitBreaker } from './resilience/circuit-breaker';
import {
  ApiError,
  CircuitOpenError,
  IdempotencyConflictError,
  InsufficientCreditsError,
  NetworkError,
  NotFoundError,
  ReservationExpiredError,
} from './errors';

export interface RequestOptions {
  method?: 'GET' | 'POST';
  /** Query params; undefined values are dropped. */
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Caller-supplied key for safe retries of mutating requests. */
  idempotencyKey?: string;
  /** Conditional GET — sends If-None-Match; a 304 resolves to `notModified`. */
  etag?: string;
  signal?: AbortSignal;
}

export interface HttpResponse<T> {
  status: number;
  data: T;
  etag?: string;
  notModified?: boolean;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Low-level transport: auth headers, timeout, exponential-backoff retry for
 * transient failures, response → typed-error mapping, and a transport-level
 * circuit breaker. Endpoint shapes live in MonetizationClient; resilience
 * semantics (cache, fallback) live in the WalletStore layer above.
 */
export class HttpClient {
  private readonly breaker: CircuitBreaker;

  constructor(private readonly config: ResolvedConfig) {
    this.breaker = new CircuitBreaker(config.circuitBreaker, config.now);
  }

  getCircuitState() {
    return this.breaker.getState();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    if (!this.breaker.canPass()) {
      throw new CircuitOpenError();
    }

    const url = this.buildUrl(path, options.query);
    const headers = await this.buildHeaders(options);
    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    };

    const { maxRetries, baseDelayMs } = this.config.retry;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, init, options.signal);
        const outcome = await this.handleResponse<T>(response);

        // Transient server failures count against the breaker and may retry.
        if (outcome.kind === 'retryable') {
          this.breaker.recordFailure();
          lastError = outcome.error;
          if (attempt < maxRetries) {
            await this.sleep(baseDelayMs * 2 ** attempt);
            continue;
          }
          throw outcome.error;
        }

        // Business responses (2xx, 304, 4xx) are a healthy server.
        this.breaker.recordSuccess();
        if (outcome.kind === 'error') throw outcome.error;
        return outcome.response;
      } catch (error) {
        // Network/abort: no HTTP response. Counts against the breaker, retryable.
        if (error instanceof ApiError || error instanceof InsufficientCreditsError) {
          throw error;
        }
        this.breaker.recordFailure();
        lastError = new NetworkError(
          error instanceof Error ? error.message : 'Network request failed',
          error,
        );
        if (attempt < maxRetries) {
          await this.sleep(baseDelayMs * 2 ** attempt);
          continue;
        }
        throw lastError;
      }
    }

    throw lastError ?? new NetworkError('Request failed');
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(this.config.baseUrl + path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async buildHeaders(options: RequestOptions): Promise<Record<string, string>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.config.apiKey) headers['X-Api-Key'] = this.config.apiKey;
    if (this.config.getUserToken) {
      const token = await this.config.getUserToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    if (options.etag) headers['If-None-Match'] = options.etag;
    return headers;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    externalSignal?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    try {
      return await this.config.fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private async handleResponse<T>(
    response: Response,
  ): Promise<
    | { kind: 'ok'; response: HttpResponse<T> }
    | { kind: 'error'; error: Error }
    | { kind: 'retryable'; error: Error }
  > {
    const etag = response.headers.get('ETag') ?? undefined;

    if (response.status === 304) {
      return { kind: 'ok', response: { status: 304, data: undefined as T, etag, notModified: true } };
    }

    if (response.ok) {
      const data = (await this.parseBody(response)) as T;
      return { kind: 'ok', response: { status: response.status, data, etag } };
    }

    const body = await this.parseBody(response);
    const message = this.errorMessage(body, response.status);

    switch (response.status) {
      case 402: {
        const b = body as { balance?: number; required?: number } | undefined;
        return {
          kind: 'error',
          error: new InsufficientCreditsError(b?.balance ?? 0, b?.required ?? 0, body),
        };
      }
      case 404:
        return { kind: 'error', error: new NotFoundError(message, body) };
      case 409:
        return { kind: 'error', error: new IdempotencyConflictError(message, body) };
      case 410:
        return { kind: 'error', error: new ReservationExpiredError(message, body) };
      default:
        if (RETRYABLE_STATUS.has(response.status)) {
          return { kind: 'retryable', error: new ApiError(response.status, message, body) };
        }
        return { kind: 'error', error: new ApiError(response.status, message, body) };
    }
  }

  private async parseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private errorMessage(body: unknown, status: number): string {
    if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as { message: unknown }).message;
      if (typeof m === 'string') return m;
    }
    return `Request failed with status ${status}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
