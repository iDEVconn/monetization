import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { InsufficientCreditsError } from '@idevconn/monetization/core';
import type { ConsumesCreditsMetadata } from '../decorators/consumes-credits.decorator';
import type { CreditWalletClient } from '../clients/credit-wallet.client';
import type { JobRegistry } from '../job-registry/job-registry';
import { CreditConsumeInterceptor } from './credit-consume.interceptor';

function setup(opts: {
  meta?: ConsumesCreditsMetadata;
  user?: unknown;
  handler: CallHandler;
  reserve?: ReturnType<typeof vi.fn>;
}) {
  const reflector = { get: vi.fn().mockReturnValue(opts.meta) } as unknown as Reflector;
  const credits = {
    reserve: opts.reserve ?? vi.fn(async () => ({ reservationId: 'res-1', heldAmount: 10, balance: 90, expiresAt: '' })),
    commit: vi.fn(async () => ({ committed: 10, released: 0, balance: 80 })),
    void: vi.fn(async () => ({ released: 10, balance: 90 })),
  } as unknown as CreditWalletClient;
  const registry = { set: vi.fn(async () => undefined), take: vi.fn() } as unknown as JobRegistry;

  const context = {
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: opts.user }) }),
  } as unknown as ExecutionContext;

  const interceptor = new CreditConsumeInterceptor(reflector, credits, registry);
  return { interceptor, context, credits, registry };
}

const meta: ConsumesCreditsMetadata = { operation: 'generate_voice' };

describe('CreditConsumeInterceptor', () => {
  it('passes through when no @ConsumesCredits metadata', async () => {
    const { interceptor, context, credits } = setup({
      meta: undefined,
      handler: { handle: () => of({ ok: true }) },
    });
    const result = await firstValueFrom(
      await interceptor.intercept(context, { handle: () => of({ ok: true }) }),
    );
    expect(result).toEqual({ ok: true });
    expect((credits.reserve as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('no-ops when request has no user', async () => {
    const { interceptor, context, credits } = setup({ meta, user: undefined, handler: { handle: () => of({}) } });
    await firstValueFrom(await interceptor.intercept(context, { handle: () => of({ ok: 1 }) }));
    expect((credits.reserve as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('reserves then commits immediately for a plain response (no jobId)', async () => {
    const { interceptor, context, credits, registry } = setup({ meta, user: { id: 'u1' }, handler: { handle: () => of({ ok: true }) } });
    const out = await firstValueFrom(await interceptor.intercept(context, { handle: () => of({ ok: true }) }));

    expect((credits.reserve as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('u1', 'generate_voice', undefined);
    expect((credits.commit as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('res-1');
    expect((registry.set as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect(out).toEqual({ ok: true });
  });

  it('binds the reservation to a jobId and defers commit', async () => {
    const { interceptor, context, credits, registry } = setup({ meta, user: { id: 'u1' }, handler: { handle: () => of({ jobId: 'j1' }) } });
    await firstValueFrom(await interceptor.intercept(context, { handle: () => of({ jobId: 'j1' }) }));

    expect((registry.set as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('j1', 'res-1');
    expect((credits.commit as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('maps InsufficientCreditsError to a 402 HttpException', async () => {
    const reserve = vi.fn(async () => {
      throw new InsufficientCreditsError(2, 10);
    });
    const { interceptor, context } = setup({ meta, user: { id: 'u1' }, reserve, handler: { handle: () => of({}) } });

    await expect(interceptor.intercept(context, { handle: () => of({}) })).rejects.toMatchObject({
      status: 402,
    });
  });

  it('voids the reservation when the handler throws', async () => {
    const { interceptor, context, credits } = setup({ meta, user: { id: 'u1' }, handler: { handle: () => throwError(() => new Error('boom')) } });

    const obs = await interceptor.intercept(context, {
      handle: () => throwError(() => new Error('boom')),
    });

    await expect(firstValueFrom(obs)).rejects.toThrow('boom');
    expect((credits.void as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('res-1');
  });
});
