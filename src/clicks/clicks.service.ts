import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Click } from './click.entity.js';
import {
  CLICKS_QUEUE,
  RECORD_CLICK_JOB,
  type RecordClickJob,
} from './clicks.constants.js';

const STATS_DAYS = 30;

@Injectable()
export class ClicksService {
  constructor(
    @InjectQueue(CLICKS_QUEUE) private readonly queue: Queue<RecordClickJob>,
    @InjectRepository(Click) private readonly clicks: Repository<Click>,
  ) {}

  /** Called on every redirect. Only puts a job on the queue, so it's fast. */
  async track(data: RecordClickJob): Promise<void> {
    await this.queue.add(RECORD_CLICK_JOB, data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: 1000,
    });
  }

  async stats(linkId: string) {
    const [daily, referrers, devices] = await Promise.all([
      // One row per day for the last 30 days, including days with 0 clicks.
      this.clicks.query<{ day: string; clicks: number }[]>(
        `SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
                COUNT(c.id)::int AS clicks
           FROM generate_series(
                  (now() AT TIME ZONE 'UTC')::date - ($2::int - 1),
                  (now() AT TIME ZONE 'UTC')::date,
                  interval '1 day'
                ) AS d(day)
           LEFT JOIN clicks c
             ON c.link_id = $1
            AND c.clicked_at >= d.day AT TIME ZONE 'UTC'
            AND c.clicked_at < (d.day + interval '1 day') AT TIME ZONE 'UTC'
          GROUP BY d.day
          ORDER BY d.day`,
        [linkId, STATS_DAYS],
      ),
      this.clicks.query<{ referrer: string; clicks: number }[]>(
        `SELECT COALESCE(referrer, 'direct') AS referrer, COUNT(*)::int AS clicks
           FROM clicks WHERE link_id = $1
          GROUP BY 1 ORDER BY clicks DESC LIMIT 5`,
        [linkId],
      ),
      this.clicks.query<{ device: string; clicks: number }[]>(
        `SELECT device, COUNT(*)::int AS clicks
           FROM clicks WHERE link_id = $1
          GROUP BY device ORDER BY clicks DESC`,
        [linkId],
      ),
    ]);
    return { daily, topReferrers: referrers, devices };
  }
}
