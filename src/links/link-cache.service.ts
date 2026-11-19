import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

/** The bits of a link a redirect needs, as stored in Redis. */
export interface CachedLink {
  id: string;
  targetUrl: string;
  /** ISO string: Redis stores JSON, so Dates come back as strings anyway. */
  expiresAt: string | null;
}

/**
 * Keeps `code -> target URL` in Redis so most redirects never touch Postgres.
 * Entries are removed whenever a link is edited or deleted.
 */
@Injectable()
export class LinkCacheService {
  private readonly ttlMs: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    config: ConfigService<Env, true>,
  ) {
    this.ttlMs = config.get('LINK_CACHE_TTL_SECONDS', { infer: true }) * 1000;
  }

  async get(code: string): Promise<CachedLink | undefined> {
    return (await this.cache.get<CachedLink>(key(code))) ?? undefined;
  }

  async set(code: string, link: CachedLink): Promise<void> {
    let ttl = this.ttlMs;
    if (link.expiresAt) {
      // Never keep a link in the cache past its own expiry.
      const untilExpiry = new Date(link.expiresAt).getTime() - Date.now();
      ttl = Math.max(1, Math.min(ttl, untilExpiry));
    }
    await this.cache.set(key(code), link, ttl);
  }

  async invalidate(code: string): Promise<void> {
    await this.cache.del(key(code));
  }
}

function key(code: string) {
  return `link:${code}`;
}
