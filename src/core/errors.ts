/**
 * Typed error hierarchy for the monetization client.
 *
 * Every failure that reaches a caller is one of these, so consumers can
 * branch on `instanceof` instead of inspecting status codes or message strings.
 */

export class MonetizationError extends Error {
  override readonly name: string = 'MonetizationError';
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
  }
}

/** Non-2xx response that is not modelled by a more specific error. */
export class ApiError extends MonetizationError {
  override readonly name: string = 'ApiError';
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
  }
}

/** 402 — the wallet cannot cover the requested operation. */
export class InsufficientCreditsError extends MonetizationError {
  override readonly name = 'InsufficientCreditsError';
  constructor(
    readonly balance: number,
    readonly required: number,
    body?: unknown,
  ) {
    super(`Insufficient credits: balance ${balance}, required ${required}`, body);
  }
}

/** 404 — reservation / wallet / resource not found. */
export class NotFoundError extends ApiError {
  override readonly name = 'NotFoundError';
  constructor(message = 'Resource not found', body?: unknown) {
    super(404, message, body);
  }
}

/** 409 — idempotency key reused with a different payload. */
export class IdempotencyConflictError extends ApiError {
  override readonly name = 'IdempotencyConflictError';
  constructor(message = 'Idempotency key reused with a different payload', body?: unknown) {
    super(409, message, body);
  }
}

/** 410 — reservation already expired (auto-released by TTL). */
export class ReservationExpiredError extends ApiError {
  override readonly name = 'ReservationExpiredError';
  constructor(message = 'Reservation already expired', body?: unknown) {
    super(410, message, body);
  }
}

/** Network failure, timeout, or aborted request — no HTTP response received. */
export class NetworkError extends MonetizationError {
  override readonly name = 'NetworkError';
}

/** The circuit breaker is open; the request was rejected without being sent. */
export class CircuitOpenError extends MonetizationError {
  override readonly name = 'CircuitOpenError';
  constructor(message = 'Circuit breaker is open') {
    super(message);
  }
}
