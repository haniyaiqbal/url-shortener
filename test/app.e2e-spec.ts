import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PasswordHasher } from '@nestjs/authentication';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

/**
 * Runs the whole app against real Postgres and Redis
 * (`docker compose up -d postgres redis` first).
 */
describe('URL shortener (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  const api = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  async function signUp() {
    const res = await api()
      .post('/api/auth/sign-up')
      .send({
        email: `${randomUUID()}@test.dev`,
        password: 'correct-horse-battery',
      })
      .expect(201);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      // A cheap hash keeps the tests fast; production uses the strong default.
      .overrideProvider(PasswordHasher)
      .useValue(new PasswordHasher({ logN: 10 }))
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    token = await signUp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects requests without a token', async () => {
    await api().get('/api/links').expect(401);
  });

  it('signs in with the right password only', async () => {
    const email = `${randomUUID()}@test.dev`;
    await api()
      .post('/api/auth/sign-up')
      .send({ email, password: 'correct-horse-battery' })
      .expect(201);
    await api()
      .post('/api/auth/sign-in')
      .send({ email: email.toUpperCase(), password: 'correct-horse-battery' })
      .expect(200);
    await api()
      .post('/api/auth/sign-in')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('shortens a link, redirects, and counts the click', async () => {
    const created = await api()
      .post('/api/links')
      .set(auth())
      .send({ url: 'https://example.com/some/long/path' })
      .expect(201);
    const { id, code } = created.body;

    await api()
      .get(`/${code}`)
      .set('User-Agent', 'Mozilla/5.0 (iPhone)')
      .set('Referer', 'https://twitter.com/someone/status/1')
      .expect(302)
      .expect('Location', 'https://example.com/some/long/path');

    // Clicks are saved by the background worker, so wait for it.
    await vi.waitFor(
      async () => {
        const stats = await api()
          .get(`/api/links/${id}/stats`)
          .set(auth())
          .expect(200);
        expect(stats.body.totalClicks).toBe(1);
        expect(stats.body.devices).toEqual([{ device: 'mobile', clicks: 1 }]);
        expect(stats.body.topReferrers).toEqual([
          { referrer: 'twitter.com', clicks: 1 },
        ]);
        expect(stats.body.daily).toHaveLength(30);
      },
      { timeout: 5000, interval: 100 },
    );
  });

  it('serves the new target right after an edit (cache is cleared)', async () => {
    const alias = `e2e-${randomUUID().slice(0, 8)}`;
    const { body } = await api()
      .post('/api/links')
      .set(auth())
      .send({ url: 'https://old.example.com', alias })
      .expect(201);
    await api()
      .get(`/${alias}`)
      .expect(302)
      .expect('Location', 'https://old.example.com');

    await api()
      .patch(`/api/links/${body.id}`)
      .set(auth())
      .send({ url: 'https://new.example.com' })
      .expect(200);
    await api()
      .get(`/${alias}`)
      .expect(302)
      .expect('Location', 'https://new.example.com');

    await api().delete(`/api/links/${body.id}`).set(auth()).expect(204);
    await api().get(`/${alias}`).expect(404);
  });

  it('refuses a taken alias', async () => {
    const alias = `dup-${randomUUID().slice(0, 8)}`;
    await api()
      .post('/api/links')
      .set(auth())
      .send({ url: 'https://a.com', alias })
      .expect(201);
    await api()
      .post('/api/links')
      .set(auth())
      .send({ url: 'https://b.com', alias })
      .expect(409);
  });

  it("keeps each user's links private", async () => {
    const { body } = await api()
      .post('/api/links')
      .set(auth())
      .send({ url: 'https://private.example.com' })
      .expect(201);
    const otherToken = await signUp();
    await api()
      .get(`/api/links/${body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('validates input', async () => {
    await api()
      .post('/api/links')
      .set(auth())
      .send({ url: 'ftp://files.example.com' })
      .expect(400);
    await api()
      .post('/api/links')
      .set(auth())
      .send({ url: 'https://a.com', expiresAt: '2001-01-01T00:00:00Z' })
      .expect(400);
  });

  it('reports healthy dependencies', async () => {
    const { body } = await api().get('/health/ready').expect(200);
    expect(body.info.database.status).toBe('up');
    expect(body.info.redis.status).toBe('up');
  });
});
