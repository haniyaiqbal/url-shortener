import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: normalizeEmail(email) });
  }

  /** Includes the password hash, which normal reads leave out. */
  findWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: normalizeEmail(email) })
      .getOne();
  }

  async create(email: string, passwordHash: string): Promise<User> {
    const saved = await this.users.save(
      this.users.create({ email: normalizeEmail(email), passwordHash }),
    );
    // Re-read so the hash (select: false) never leaks into a response.
    return (await this.findById(saved.id))!;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.users.update({ id }, { passwordHash });
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
