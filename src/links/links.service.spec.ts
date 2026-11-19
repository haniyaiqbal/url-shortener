import {
  BadRequestException,
  ConflictException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { QueryFailedError, type Repository } from 'typeorm';
import type { Link } from './link.entity.js';
import type { LinkCacheService } from './link-cache.service.js';
import { LinksService } from './links.service.js';

function uniqueViolation() {
  return new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('dup'), { code: '23505' }),
  );
}

describe('LinksService', () => {
  const repo = {
    create: vi.fn((data: Partial<Link>) => data),
    save: vi.fn(),
    findOneBy: vi.fn(),
    findAndCount: vi.fn(),
    remove: vi.fn(),
  };
  const linkCache = { get: vi.fn(), set: vi.fn(), invalidate: vi.fn() };
  const config = { get: vi.fn().mockReturnValue('https://sho.rt/') };
  let service: LinksService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo.save.mockImplementation(async (link: Partial<Link>) => ({
      id: 'link-1',
      clickCount: 0,
      ...link,
    }));
    service = new LinksService(
      repo as unknown as Repository<Link>,
      linkCache as unknown as LinkCacheService,
      config as unknown as ConfigService<any, true>,
    );
  });

  describe('create', () => {
    it('builds the short URL from APP_URL', async () => {
      const link = await service.create('user-1', {
        url: 'https://example.com',
        alias: 'hello',
      });
      expect(link.shortUrl).toBe('https://sho.rt/hello');
    });

    it('rejects reserved aliases', async () => {
      await expect(
        service.create('user-1', { url: 'https://example.com', alias: 'api' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects links to the shortener itself', async () => {
      await expect(
        service.create('user-1', { url: 'https://sho.rt/abc' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reports a taken alias as 409', async () => {
      repo.save.mockRejectedValueOnce(uniqueViolation());
      await expect(
        service.create('user-1', {
          url: 'https://example.com',
          alias: 'taken',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('retries with a new code when a random code collides', async () => {
      repo.save.mockRejectedValueOnce(uniqueViolation());
      const link = await service.create('user-1', {
        url: 'https://example.com',
      });
      expect(repo.save).toHaveBeenCalledTimes(2);
      expect(link.code).toHaveLength(7);
    });

    it('gives up after 5 collisions in a row', async () => {
      repo.save.mockRejectedValue(uniqueViolation());
      await expect(
        service.create('user-1', { url: 'https://example.com' }),
      ).rejects.toThrow('Could not generate a unique short code');
      expect(repo.save).toHaveBeenCalledTimes(5);
    });
  });

  describe('resolve', () => {
    it('uses the cache without touching the database', async () => {
      linkCache.get.mockResolvedValue({
        id: 'link-1',
        targetUrl: 'https://example.com',
        expiresAt: null,
      });
      const link = await service.resolve('abc');
      expect(link.targetUrl).toBe('https://example.com');
      expect(repo.findOneBy).not.toHaveBeenCalled();
    });

    it('falls back to the database and fills the cache', async () => {
      linkCache.get.mockResolvedValue(undefined);
      repo.findOneBy.mockResolvedValue({
        id: 'link-1',
        targetUrl: 'https://example.com',
        expiresAt: null,
      });
      await service.resolve('abc');
      expect(linkCache.set).toHaveBeenCalledWith('abc', {
        id: 'link-1',
        targetUrl: 'https://example.com',
        expiresAt: null,
      });
    });

    it('returns 404 for unknown codes', async () => {
      linkCache.get.mockResolvedValue(undefined);
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.resolve('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns 410 for expired links and does not cache them', async () => {
      linkCache.get.mockResolvedValue(undefined);
      repo.findOneBy.mockResolvedValue({
        id: 'link-1',
        targetUrl: 'https://example.com',
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.resolve('old')).rejects.toBeInstanceOf(
        GoneException,
      );
      expect(linkCache.set).not.toHaveBeenCalled();
    });
  });

  describe('update / remove', () => {
    const owned = {
      id: 'link-1',
      code: 'abc',
      userId: 'user-1',
      targetUrl: 'https://old.com',
      expiresAt: null,
    };

    it('clears the cache after an edit', async () => {
      repo.findOneBy.mockResolvedValue({ ...owned });
      await service.update('user-1', 'link-1', { url: 'https://new.com' });
      expect(linkCache.invalidate).toHaveBeenCalledWith('abc');
    });

    it('clears the cache after a delete', async () => {
      repo.findOneBy.mockResolvedValue({ ...owned });
      await service.remove('user-1', 'link-1');
      expect(linkCache.invalidate).toHaveBeenCalledWith('abc');
    });

    it("hides other users' links behind a 404", async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.remove('user-2', 'link-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.findOneBy).toHaveBeenCalledWith({
        id: 'link-1',
        userId: 'user-2',
      });
    });
  });
});
