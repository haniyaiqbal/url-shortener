import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import type { Env } from '../config/env.js';
import { Link } from './link.entity.js';
import { LinkCacheService, type CachedLink } from './link-cache.service.js';
import type {
  CreateLinkDto,
  ListLinksQuery,
  UpdateLinkDto,
} from './links.schemas.js';
import { generateShortCode, isReservedCode } from './short-code.js';

const MAX_CODE_ATTEMPTS = 5;
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class LinksService {
  private readonly baseUrl: string;
  private readonly baseHost: string;

  constructor(
    @InjectRepository(Link) private readonly links: Repository<Link>,
    private readonly linkCache: LinkCacheService,
    config: ConfigService<Env, true>,
  ) {
    this.baseUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
    this.baseHost = new URL(this.baseUrl).host;
  }

  async create(userId: string, dto: CreateLinkDto) {
    this.assertNotSelfLink(dto.url);

    if (dto.alias) {
      if (isReservedCode(dto.alias)) {
        throw new BadRequestException(`"${dto.alias}" is a reserved word`);
      }
      return this.toResponse(await this.insert(userId, dto, dto.alias));
    }

    // Random codes can (very rarely) collide: just try another one.
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      try {
        return this.toResponse(
          await this.insert(userId, dto, generateShortCode()),
        );
      } catch (error) {
        if (!(error instanceof ConflictException)) throw error;
      }
    }
    throw new Error('Could not generate a unique short code');
  }

  async list(userId: string, { page, limit }: ListLinksQuery) {
    const [items, total] = await this.links.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: items.map((link) => this.toResponse(link)),
      page,
      limit,
      total,
    };
  }

  async findOne(userId: string, id: string) {
    return this.toResponse(await this.findOwned(userId, id));
  }

  async update(userId: string, id: string, dto: UpdateLinkDto) {
    const link = await this.findOwned(userId, id);
    if (dto.url !== undefined) {
      this.assertNotSelfLink(dto.url);
      link.targetUrl = dto.url;
    }
    if (dto.expiresAt !== undefined) {
      link.expiresAt = dto.expiresAt;
    }
    const saved = await this.links.save(link);
    await this.linkCache.invalidate(link.code);
    return this.toResponse(saved);
  }

  async remove(userId: string, id: string): Promise<void> {
    const link = await this.findOwned(userId, id);
    await this.links.remove(link);
    await this.linkCache.invalidate(link.code);
  }

  /**
   * Finds where a short code points, for the redirect. Redis first, then
   * Postgres (and the result is cached for next time).
   */
  async resolve(code: string): Promise<CachedLink> {
    let link = await this.linkCache.get(code);
    if (!link) {
      const found = await this.links.findOneBy({ code });
      if (!found) throw new NotFoundException('Short link not found');
      link = {
        id: found.id,
        targetUrl: found.targetUrl,
        expiresAt: found.expiresAt?.toISOString() ?? null,
      };
      if (!isExpired(link)) await this.linkCache.set(code, link);
    }
    if (isExpired(link)) throw new GoneException('This short link has expired');
    return link;
  }

  /** Someone else's link looks exactly like a missing one: no 403 hint. */
  async findOwned(userId: string, id: string): Promise<Link> {
    const link = await this.links.findOneBy({ id, userId });
    if (!link) throw new NotFoundException('Link not found');
    return link;
  }

  private async insert(userId: string, dto: CreateLinkDto, code: string) {
    try {
      return await this.links.save(
        this.links.create({
          code,
          userId,
          targetUrl: dto.url,
          expiresAt: dto.expiresAt ?? null,
        }),
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException(`"${code}" is already taken`);
      }
      throw error;
    }
  }

  /** Shortening one of our own short links would make a redirect loop. */
  private assertNotSelfLink(url: string) {
    if (new URL(url).host === this.baseHost) {
      throw new BadRequestException("Can't shorten a link to this service");
    }
  }

  private toResponse(link: Link) {
    return {
      id: link.id,
      code: link.code,
      shortUrl: `${this.baseUrl}/${link.code}`,
      targetUrl: link.targetUrl,
      clickCount: link.clickCount,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }
}

function isExpired(link: CachedLink): boolean {
  return (
    link.expiresAt !== null && new Date(link.expiresAt).getTime() <= Date.now()
  );
}
