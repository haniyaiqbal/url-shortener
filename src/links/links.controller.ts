import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Throttle, minutes } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClicksService } from '../clicks/clicks.service.js';
import {
  createLinkSchema,
  linkIdSchema,
  listLinksQuerySchema,
  updateLinkSchema,
  type CreateLinkDto,
  type ListLinksQuery,
  type UpdateLinkDto,
} from './links.schemas.js';
import { LinksService } from './links.service.js';

@ApiTags('links')
@ApiBearerAuth()
@Controller('api/links')
export class LinksController {
  constructor(
    private readonly linksService: LinksService,
    private readonly clicksService: ClicksService,
  ) {}

  @Throttle({ default: { limit: 30, ttl: minutes(1) } })
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body({ schema: createLinkSchema }) body: CreateLinkDto,
  ) {
    return this.linksService.create(userId, body);
  }

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query({ schema: listLinksQuerySchema }) query: ListLinksQuery,
  ) {
    return this.linksService.list(userId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', { schema: linkIdSchema }) id: string,
  ) {
    return this.linksService.findOne(userId, id);
  }

  @Get(':id/stats')
  async stats(
    @CurrentUser('id') userId: string,
    @Param('id', { schema: linkIdSchema }) id: string,
  ) {
    const link = await this.linksService.findOwned(userId, id);
    return {
      linkId: link.id,
      totalClicks: link.clickCount,
      ...(await this.clicksService.stats(link.id)),
    };
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id', { schema: linkIdSchema }) id: string,
    @Body({ schema: updateLinkSchema }) body: UpdateLinkDto,
  ) {
    return this.linksService.update(userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', { schema: linkIdSchema }) id: string,
  ) {
    return this.linksService.remove(userId, id);
  }
}
