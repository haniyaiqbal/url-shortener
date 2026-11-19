import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticationModule } from '@nestjs/authentication';
import type { Env } from '../config/env.js';
import { User } from '../users/user.entity.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuth } from './jwt-auth.provider.js';

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: User;
    // Short-lived access tokens only: sign in again when one expires.
    refreshTokens: false;
  }
}

@Module({
  imports: [
    // Also registers a global guard: every route needs a valid token
    // unless it's marked @Public().
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        accessToken: {
          key: config.get('JWT_SECRET', { infer: true }),
          issuer: 'url-shortener',
          audience: 'url-shortener-api',
          ttl: '1h',
        },
        refreshToken: false,
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuth],
})
export class AuthModule {}
