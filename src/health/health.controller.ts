import { Controller, Get } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { InjectQueue } from '@nestjs/bullmq';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import type { Queue } from 'bullmq';
import { CLICKS_QUEUE } from '../clicks/clicks.constants.js';

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly indicators: HealthIndicatorService,
    @InjectQueue(CLICKS_QUEUE) private readonly clicksQueue: Queue,
  ) {}

  /** Is the process up? (no dependencies checked) */
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  /** Can it serve traffic? Postgres and Redis must both answer. */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database').withTimeout('1s'),
      () =>
        this.indicators
          .check('redis')
          // Reading the queue size is a real round trip to Redis.
          .attempt(() => this.clicksQueue.getWaitingCount())
          .withSuccessData((waiting) => ({ queuedClicks: waiting }))
          .withTimeout('1s'),
    ]);
  }
}
