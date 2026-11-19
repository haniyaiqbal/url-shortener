import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';
import { createKeyv } from '@keyv/redis';
import { Redis } from 'ioredis';
import { AuthModule } from './auth/auth.module.js';
import { ClicksModule } from './clicks/clicks.module.js';
import { envSchema, type Env } from './config/env.js';
import { dataSourceOptions } from './database/data-source.js';
import { HealthModule } from './health/health.module.js';
import { LinksModule } from './links/links.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...dataSourceOptions,
        url: config.get('DATABASE_URL', { infer: true }),
        // Applies pending migrations on startup. Never `synchronize`.
        migrationsRun: true,
      }),
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const redisStore = createKeyv(config.get('REDIS_URL', { infer: true }));
        // Without this listener a Redis outage would crash the app.
        redisStore.on('error', (error: Error) =>
          console.error('Redis cache error:', error.message),
        );
        return { stores: [redisStore] };
      },
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: new Redis(config.get('REDIS_URL', { infer: true }), {
          // Required by BullMQ workers.
          maxRetriesPerRequest: null,
        }),
      }),
    }),

    // 100 requests a minute per IP by default; some routes set tighter limits.
    ThrottlerModule.forRoot([{ name: 'default', ttl: minutes(1), limit: 100 }]),

    UsersModule,
    AuthModule,
    LinksModule,
    ClicksModule,
    HealthModule,
  ],
  providers: [
    // Runs before the auth guard, so floods are rejected cheaply.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_PIPE, useValue: new StandardSchemaValidationPipe() },
  ],
})
export class AppModule {}
