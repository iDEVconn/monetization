import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { catchError, from, mergeMap, type Observable, throwError } from 'rxjs';

import { InsufficientCreditsError } from '@idevconn/monetization/core';
import type { ConsumesCreditsMetadata } from '../decorators/consumes-credits.decorator';
import { CONSUMES_CREDITS, JOB_REGISTRY } from '../monetization.constants';
import type { JobRegistry } from '../job-registry/job-registry';
import { CreditWalletClient } from '../clients/credit-wallet.client';

/**
 * Implements the reserve → commit/void lifecycle for @ConsumesCredits handlers
 * (docs/design/03-sdk-nest.md). Applied globally by the module.
 *
 * 1. Before the handler: reserve (cost resolved server-side). 402 short-circuits.
 * 2. Handler returns. If bound to a job id → register jobId→reservationId and let
 *    the job lifecycle commit/void. Otherwise → commit immediately.
 * 3. Handler throws → void the reservation, then rethrow.
 *
 * No `request.user` → no-op (public endpoints are unaffected).
 */
@Injectable()
export class CreditConsumeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CreditConsumeInterceptor.name);

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(CreditWalletClient) private readonly credits: CreditWalletClient,
    @Inject(JOB_REGISTRY) private readonly registry: JobRegistry,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const meta = this.reflector.get<ConsumesCreditsMetadata | undefined>(
      CONSUMES_CREDITS,
      context.getHandler(),
    );
    if (!meta) return next.handle();

    const request = context.switchToHttp().getRequest<{ user?: { id?: string; uid?: string } }>();
    const userId = request?.user?.id ?? request?.user?.uid;
    if (!userId) return next.handle();

    const estimate = meta.units?.(request);

    let reservationId: string;
    try {
      const reservation = await this.credits.reserve(userId, meta.operation, estimate);
      reservationId = reservation.reservationId;
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            error: 'insufficient_credits',
            message: error.message,
            balance: error.balance,
            required: error.required,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      throw error;
    }

    return next.handle().pipe(
      mergeMap((response) => from(this.settle(meta, reservationId, response))),
      catchError((error) =>
        from(this.credits.void(reservationId).catch((voidError) => {
          this.logger.error(`Failed to void reservation ${reservationId}`, voidError);
        })).pipe(mergeMap(() => throwError(() => error))),
      ),
    );
  }

  private async settle(
    meta: ConsumesCreditsMetadata,
    reservationId: string,
    response: unknown,
  ): Promise<unknown> {
    const jobId = this.resolveJobId(meta, response);
    const commitOn = meta.commitOn ?? (jobId ? 'job' : 'response');

    if (commitOn === 'job' && jobId) {
      await this.registry.set(jobId, reservationId);
      return response;
    }

    await this.credits.commit(reservationId);
    return response;
  }

  private resolveJobId(meta: ConsumesCreditsMetadata, response: unknown): string | undefined {
    if (meta.bindReservationTo) return meta.bindReservationTo(response);
    if (response && typeof response === 'object') {
      const r = response as { jobId?: unknown; id?: unknown };
      if (typeof r.jobId === 'string') return r.jobId;
      if (typeof r.id === 'string') return r.id;
    }
    return undefined;
  }
}
