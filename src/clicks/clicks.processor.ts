import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { Link } from '../links/link.entity.js';
import { Click } from './click.entity.js';
import {
  CLICKS_QUEUE,
  RECORD_CLICK_JOB,
  type RecordClickJob,
} from './clicks.constants.js';
import { detectDevice, referrerHost } from './device.js';

/**
 * The background worker: saves each click and bumps the link's counter.
 * Runs separately from the redirect, so a slow database never slows
 * down people opening links.
 */
@Processor(CLICKS_QUEUE)
export class ClicksProcessor extends WorkerHost {
  private readonly logger = new Logger(ClicksProcessor.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async process(job: Job<RecordClickJob>): Promise<void> {
    if (job.name !== RECORD_CLICK_JOB) {
      throw new Error(`Unknown job: ${job.name}`);
    }
    const { linkId, clickedAt, referrer, userAgent } = job.data;

    // Both writes succeed or neither does, so the counter always matches
    // the number of click rows.
    await this.dataSource.transaction(async (manager) => {
      const { affected } = await manager.increment(
        Link,
        { id: linkId },
        'clickCount',
        1,
      );
      // The link was deleted after the click was queued: nothing to record.
      if (!affected) return;

      await manager.insert(Click, {
        linkId,
        clickedAt: new Date(clickedAt),
        referrer: referrerHost(referrer),
        device: detectDevice(userAgent),
      });
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.warn(
      `Click job ${job?.id} failed (attempt ${job?.attemptsMade}): ${error.message}`,
    );
  }
}
