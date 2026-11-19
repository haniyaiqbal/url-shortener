import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser, Public } from '@nestjs/authentication';
import { Throttle, minutes } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '../users/user.entity.js';
import {
  signInSchema,
  signUpSchema,
  type SignInDto,
  type SignUpDto,
} from './auth.schemas.js';
import { AuthService } from './auth.service.js';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: minutes(15) } })
  @Post('sign-up')
  signUp(@Body({ schema: signUpSchema }) body: SignUpDto) {
    return this.authService.signUp(body.email, body.password);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: minutes(15) } })
  @Post('sign-in')
  @HttpCode(200)
  signIn(@Body({ schema: signInSchema }) body: SignInDto) {
    return this.authService.signIn(body.email, body.password);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: User) {
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }
}
