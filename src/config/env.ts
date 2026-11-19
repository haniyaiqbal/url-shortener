import { z } from 'zod';

/**
 * Every environment variable the app reads. The app refuses to start if one
 * is missing or invalid, so a bad deploy fails loudly instead of half-working.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long'),
  /** Public address short links are built on, e.g. https://sho.rt */
  APP_URL: z.url(),
  /** Origin of the web frontend, allowed by CORS. */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /** How long a resolved short link stays in Redis, in seconds. */
  LINK_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
});

export type Env = z.infer<typeof envSchema>;
