import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ClicksModule } from '../clicks/clicks.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule, ClicksModule],
  controllers: [HealthController],
})
export class HealthModule {}
