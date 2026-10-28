import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

// Auto-load environment variables if DATABASE_URL is not yet set
if (!process.env.DATABASE_URL) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidateEnvPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/api/.env'),
    path.resolve(currentDir, '../../.env'),
    path.resolve(currentDir, '../../../../.env'),
  ];
  for (const candidate of candidateEnvPaths) {
    if (fs.existsSync(candidate)) {
      process.loadEnvFile(candidate);
      if (process.env.DATABASE_URL) break;
    }
  }
}

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export * from './schema/index.js';
