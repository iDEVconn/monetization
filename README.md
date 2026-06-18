# @idevconn/monetization

Client SDK for the **iSubscribe monetization platform** — credit wallets, two-phase
reservations, revenue wallets, pricing, and entitlements.

It is the client for the SaaS wallet APIs. It owns *none* of the money logic
(that lives in the SaaS); it owns ergonomics, resilience, and lifecycle wiring so
a customer app consumes the platform with minimal code.

## Status

| Entry point | What | State |
|-------------|------|-------|
| `@idevconn/monetization/core` | transport-agnostic API client, types, cache, circuit breaker, `WalletStore` | ✅ shipped (hosted mode) |
| `@idevconn/monetization/nest` | NestJS module, `@ConsumesCredits` decorator, interceptor, job-settlement | ✅ shipped |
| `@idevconn/monetization/react` | provider + read-only hooks (`useCreditWallet`, `useCreditGate`, `useEntitlements`, `useRevenueWallet`) | ✅ hooks shipped; styled components next |

## `/core`

```ts
import { createMonetizationCore } from '@idevconn/monetization/core';

const { client, store } = createMonetizationCore({
  baseUrl: 'https://api.isubscribe.me/api/v1',
  apiKey: process.env.ISUBSCRIBE_API_KEY,   // server-to-server
  fallback: 'fail-closed',                  // or 'fail-open' for UX-first gating
  cache: { balanceTtlMs: 10_000 },
  circuitBreaker: { errorThresholdPercent: 50, openMs: 30_000 },
  retry: { maxRetries: 2 },
});

// Low-level typed client — one method per API endpoint
const reservation = await client.createReservation({ userId, operation: 'generate_voice' });
await client.commitReservation(reservation.reservationId, { actualUnits: 2 });

// Resilience-wrapped store — the interface /nest and /react consume
const res = await store.reserve(userId, 'generate_voice');
const balance = await store.getBalance(userId); // served from TTL cache when fresh
```

### Two layers

- **`client`** (`MonetizationClient`) — one method per endpoint
  (reservations, grant, balance, ledger, estimate, reconcile, pricing, revenue,
  entitlements). Handles auth headers, idempotency keys, retries, timeouts, and
  maps responses to typed errors.
- **`store`** (`HostedWalletStore` → `WalletStore`) — the small interface the
  upper layers depend on. Adds the resilience contract: balance TTL cache,
  circuit breaker, and the configurable fallback policy. Swapping `mode` later
  (local / hybrid) swaps the implementation without changing consumers.

### Errors

All failures are typed: `InsufficientCreditsError` (402), `NotFoundError` (404),
`IdempotencyConflictError` (409), `ReservationExpiredError` (410), `ApiError`
(other non-2xx), `NetworkError`, `CircuitOpenError`. Branch on `instanceof`.

### Resilience

- **Cache** — balances served from a short TTL cache; the stale value backs the
  fallback path when the SaaS is unreachable.
- **Circuit breaker** — transport-level; trips on repeated server/network
  failures and rejects fast with `CircuitOpenError` until a half-open trial.
- **Fallback** — `fail-open` mints an optimistic zero-hold reservation on outage
  (commit/void then no-op, settled by reconciliation); `fail-closed` rethrows.
- Business answers (e.g. insufficient credits) never trigger fallback.

## Develop

```bash
yarn install
yarn typecheck
yarn test
yarn build
```

Stack: TypeScript, tsup (ESM + CJS + `.d.ts`), Vitest. `/core` has no NestJS or
React dependency.

## License

MIT
