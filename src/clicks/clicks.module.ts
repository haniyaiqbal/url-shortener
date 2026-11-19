import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Click } from './click.entity.js';
import { CLICKS_QUEUE } from './clicks.constants.js';
import { ClicksProcessor } from './clicks.processor.js';
import { ClicksService } from './clicks.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Click]),
    BullModule.registerQueue({ name: CLICKS_QUEUE }),
  ],
  providers: [ClicksService, ClicksProcessor],
  exports: [ClicksService, BullModule],
})
export class ClicksModule {}
