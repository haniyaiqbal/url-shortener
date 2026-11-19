import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordHasher, TokenService } from '@nestjs/authentication';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async signUp(email: string, password: string) {
    if (await this.usersService.findByEmail(email)) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await this.passwordHasher.hash(password);
    const user = await this.usersService.create(email, passwordHash);
    return this.issueTokens(user);
  }

  async signIn(email: string, password: string) {
    const found = await this.usersService.findWithPassword(email);
    // verify() still does the slow hash when the user doesn't exist, so the
    // response time doesn't reveal which emails are registered.
    const valid = await this.passwordHasher.verify(
      password,
      found?.passwordHash,
    );
    if (!found || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (this.passwordHasher.needsRehash(found.passwordHash)) {
      await this.usersService.updatePasswordHash(
        found.id,
        await this.passwordHasher.hash(password),
      );
    }
    return this.issueTokens(found);
  }

  private async issueTokens(user: User) {
    const { accessToken, expiresIn } = await this.tokenService.issue(user.id, {
      method: 'password',
      claims: { amr: ['pwd'] },
    });
    return {
      accessToken,
      expiresIn,
      user: { id: user.id, email: user.email },
    };
  }
}
