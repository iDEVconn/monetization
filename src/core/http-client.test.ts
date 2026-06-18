import { describe, expect, it, vi } from 'vitest';

import { resolveConfig } from './config';
import {
  ApiError,
  IdempotencyConflictError,
  InsufficientCreditsError,
  NetworkError,
  NotFoundError,
  ReservationExpiredError,
} from './errors';
import { HttpClient } from './http-client';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/** Duck-typed response for null-body statuses (e.g. 304) the Response ctor rejects. */
function statusResponse(status: number, headers: Record<string, string> = {}): Response {
  const h = new Headers(headers);
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: h,
    text: async () => '',
  } as unknown as Response;
}

function makeClient(fetchImpl: typeof fetch, overrides = {}) {
  const config = resolveConfig({
    baseUrl: 'https://api.test/api/v1',
    apiKey: 'secret-key',
    fetch: fetchImpl,
    retry: { maxRetries: 2, baseDelayMs: 1 },
    ...overrides,
  });
  return new HttpClient(config);
}

describe('HttpClient', () => {
  it('sends auth + idempotency headers and parses JSON', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ ok: true }));
    const client = makeClient(fetchImpl as unknown as typeof fetch);

    const res = await client.request<{ ok: boolean }>('/credits/grant', {
      method: 'POST',
      body: { amount: 10 },
      idempotencyKey: 'idem-1',
    });

    expect(res.data).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.test/api/v1/credits/grant');
    const headers = init!.headers as Record<string, string>;
    expect(headers['X-Api-Key']).toBe('secret-key');
    expect(headers['Idempotency-Key']).toBe('idem-1');
  });

  it('attaches a bearer token from getUserToken', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ balance: 5 }));
    const client = makeClient(fetchImpl as unknown as typeof fetch, {
      getUserToken: () => 'user-jwt',
    });

    await client.request('/credits/balance/u1');

    const headers = fetchImpl.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer user-jwt');
  });

  it('appends defined query params and drops undefined ones', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ total: 0, entries: [] }),
    );
    const client = makeClient(fetchImpl as unknown as typeof fetch);

    await client.request('/credits/ledger/u1', { query: { limit: 25, offset: undefined } });

    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.test/api/v1/credits/ledger/u1?limit=25');
  });

  it('maps 402 to InsufficientCreditsError with balance + required', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ balance: 3, required: 10 }, 402));
    const client = makeClient(fetchImpl as unknown as typeof fetch);

    await expect(client.request('/credits/reservations', { method: 'POST' })).rejects.toMatchObject(
      { name: 'InsufficientCreditsError', balance: 3, required: 10 },
    );
    await expect(
      client.request('/credits/reservations', { method: 'POST' }),
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
  });

  it('maps 404 / 409 / 410 to their typed errors', async () => {
    const cases: Array<[number, unknown]> = [
      [404, NotFoundError],
      [409, IdempotencyConflictError],
      [410, ReservationExpiredError],
    ];
    for (const [status, type] of cases) {
      const client = makeClient(
        vi.fn(async () => jsonResponse({ message: 'x' }, status)) as unknown as typeof fetch,
      );
      await expect(client.request('/x')).rejects.toBeInstanceOf(type as never);
    }
  });

  it('retries retryable 503 then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'down' }, 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    const client = makeClient(fetchImpl as unknown as typeof fetch);

    const res = await client.request<{ ok: boolean }>('/x');
    expect(res.data).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 404 business error', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: 'nope' }, 404));
    const client = makeClient(fetchImpl as unknown as typeof fetch);

    await expect(client.request('/x')).rejects.toBeInstanceOf(NotFoundError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('wraps network failures in NetworkError after exhausting retries', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    const client = makeClient(fetchImpl as unknown as typeof fetch);

    await expect(client.request('/x')).rejects.toBeInstanceOf(NetworkError);
    expect(fetchImpl).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('surfaces a 304 as notModified', async () => {
    const fetchImpl = vi.fn(async () => statusResponse(304, { ETag: 'v2' }));
    const client = makeClient(fetchImpl as unknown as typeof fetch);

    const res = await client.request('/entitlements/u1', { etag: 'v2' });
    expect(res.notModified).toBe(true);
    expect(res.etag).toBe('v2');
  });

  it('opens the circuit after repeated server failures and rejects fast', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: 'down' }, 503));
    const client = makeClient(fetchImpl as unknown as typeof fetch, {
      retry: { maxRetries: 0, baseDelayMs: 1 },
      circuitBreaker: { errorThresholdPercent: 50, openMs: 30_000, volumeThreshold: 4 },
    });

    for (let i = 0; i < 4; i++) {
      await expect(client.request('/x')).rejects.toBeInstanceOf(ApiError);
    }
    expect(client.getCircuitState()).toBe('open');

    const callsBefore = fetchImpl.mock.calls.length;
    await expect(client.request('/x')).rejects.toMatchObject({ name: 'CircuitOpenError' });
    expect(fetchImpl.mock.calls.length).toBe(callsBefore); // request never sent
  });
});
