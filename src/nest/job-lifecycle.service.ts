import { Inject, Injectable, Logger } from '@nestjs/common';

import { JOB_REGISTRY } from './monetization.constants';
import type { JobRegistry } from './job-registry/job-registry';
import { CreditWalletClient } from './clients/credit-wallet.client';

/**
 * Settles reservations bound to async jobs. The BullMQ glue calls these on
 * queue events; they are also public so apps using a different queue can wire
 * their own completion/failure handlers.
 *
 * `take` is once-only, so a duplicate completion/failure event is a safe no-op.
 */
@Injectable()
export class JobLifecycleService {
  private readonly logger = new Logger(JobLifecycleService.name);

  constructor(
    @Inject(JOB_REGISTRY) private readonly registry: JobRegistry,
    @Inject(CreditWalletClient) private readonly credits: CreditWalletClient,
  ) {}

  /** Job finished successfully → commit the held reservation (with measured units). */
  async onJobCompleted(jobId: string, actualUnits?: number): Promise<void> {
    const reservationId = await this.registry.take(jobId);
    if (!reservationId) return;
    try {
      await this.credits.commit(reservationId, actualUnits);
    } catch (error) {
      this.logger.error(`Failed to commit reservation ${reservationId} for job ${jobId}`, error);
      throw error;
    }
  }

  /** Job failed/cancelled → void the held reservation, releasing the credits. */
  async onJobFailed(jobId: string): Promise<void> {
    const reservationId = await this.registry.take(jobId);
    if (!reservationId) return;
    try {
      await this.credits.void(reservationId);
    } catch (error) {
      this.logger.error(`Failed to void reservation ${reservationId} for job ${jobId}`, error);
      throw error;
    }
  }
}
