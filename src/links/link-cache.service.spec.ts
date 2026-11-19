import type { Cache } from '@nestjs/cache-manager';
import type { ConfigService } from '@nestjs/config';
import { LinkCacheService } from './link-cache.service.js';

describe('LinkCacheService', () => {
  const cache = { get: vi.fn(), set: vi.fn(), del: vi.fn() };
  const config = { get: vi.fn().mockReturnValue(3600) };
  let service: LinkCacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LinkCacheService(
      cache as unknown as Cache,
      config as unknown as ConfigService<any, true>,
    );
  });

  it('caches for the configured TTL when the link never expires', async () => {
    await service.set('abc', {
      id: '1',
      targetUrl: 'https://a.com',
      expiresAt: null,
    });
    expect(cache.set).toHaveBeenCalledWith(
      'link:abc',
      expect.any(Object),
      3_600_000,
    );
  });

  it('never caches past the link’s own expiry', async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    await service.set('abc', {
      id: '1',
      targetUrl: 'https://a.com',
      expiresAt,
    });
    const ttl = cache.set.mock.calls[0][2] as number;
    expect(ttl).toBeGreaterThan(55_000);
    expect(ttl).toBeLessThanOrEqual(60_000);
  });

  it('returns undefined on a miss', async () => {
    cache.get.mockResolvedValue(undefined);
    await expect(service.get('abc')).resolves.toBeUndefined();
  });

  it('removes the entry on invalidate', async () => {
    await service.invalidate('abc');
    expect(cache.del).toHaveBeenCalledWith('link:abc');
  });
});
