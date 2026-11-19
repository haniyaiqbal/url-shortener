import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { Click } from '../clicks/click.entity.js';
import { Link } from '../links/link.entity.js';
import { User } from '../users/user.entity.js';

/**
 * Shared by the app (TypeOrmModule) and the TypeORM CLI, so migrations are
 * generated against exactly the entities the app uses.
 */
export const dataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Link, Click],
  // .ts when run through the CLI (tsx), .js once built.
  migrations: [join(import.meta.dirname, 'migrations', '*.{ts,js}')],
} satisfies DataSourceOptions;

// Used by the TypeORM CLI: `npm run migration:generate`, `npm run migration:run`.
export default new DataSource(dataSourceOptions);
