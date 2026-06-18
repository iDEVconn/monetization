import { SetMetadata } from '@nestjs/common';

import type { Estimate } from '@idevconn/monetization/core';
import { CONSUMES_CREDITS } from '../monetization.constants';

export interface ConsumesCreditsOptions {
  /** Derive sizing hints for the hold from the request (per-unit operations). */
  units?: (request: unknown) => Estimate;
  /**
   * Pull the job id from the handler's response to bind the reservation to a job.
   * Defaults to `response.jobId ?? response.id`.
   */
  bindReservationTo?: (response: unknown) => string | undefined;
  /**
   * When to commit. 'response' commits as soon as the handler returns; 'job'
   * defers commit/void to the BullMQ lifecycle. Default: 'job' if a job id is
   * found on the response, else 'response'.
   */
  commitOn?: 'response' | 'job';
}

export interface ConsumesCreditsMetadata extends ConsumesCreditsOptions {
  operation: string;
}

/**
 * Marks a controller handler as credit-consuming. The CreditConsumeInterceptor
 * reserves before the handler runs (402 short-circuits) and then commits or
 * defers to the job lifecycle. Cost is resolved server-side from the SaaS
 * pricing table — never hard-coded here.
 */
export function ConsumesCredits(
  operation: string,
  options: ConsumesCreditsOptions = {},
): MethodDecorator {
  const metadata: ConsumesCreditsMetadata = { operation, ...options };
  return SetMetadata(CONSUMES_CREDITS, metadata);
}
