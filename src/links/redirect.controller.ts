import {
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  Redirect,
} from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { ClicksService } from '../clicks/clicks.service.js';
import { LinksService } from './links.service.js';

/** The public part: https://sho.rt/<code> → the real URL. */
@ApiTags('redirect')
@Public()
@SkipThrottle()
@Controller()
export class RedirectController {
  private readonly logger = new Logger(RedirectController.name);

  constructor(
    private readonly linksService: LinksService,
    private readonly clicksService: ClicksService,
  ) {}

  @Get(':code')
  @Redirect()
  async follow(
    @Param('code') code: string,
    @Headers('referer') referrer?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const link = await this.linksService.resolve(code);

    // Counting the click must never break the redirect itself.
    this.clicksService
      .track({
        linkId: link.id,
        clickedAt: new Date().toISOString(),
        referrer: referrer ?? null,
        userAgent: userAgent ?? null,
      })
      .catch((error: Error) =>
        this.logger.error(`Could not queue click: ${error.message}`),
      );

    // 302 (not 301) so browsers don't cache it and every click is counted.
    return { url: link.targetUrl, statusCode: 302 };
  }
}
