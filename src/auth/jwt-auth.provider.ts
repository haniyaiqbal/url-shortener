import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from '@nestjs/authentication';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';

/**
 * Reads `Authorization: Bearer <token>` on every request, checks the
 * signature and expiry, and loads the user the token belongs to.
 */
@Injectable()
export class JwtAuth extends JwtBearerProvider<User> {
  constructor(
    private readonly usersService: UsersService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  validate({ sub }: JwtClaims) {
    // A deleted user's token stops working straight away.
    return sub ? this.usersService.findById(sub) : null;
  }
}
