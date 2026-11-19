import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClicksModule } from '../clicks/clicks.module.js';
import { Link } from './link.entity.js';
import { LinkCacheService } from './link-cache.service.js';
import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';
import { RedirectController } from './redirect.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Link]), ClicksModule],
  controllers: [LinksController, RedirectController],
  providers: [LinksService, LinkCacheService],
})
export class LinksModule {}
