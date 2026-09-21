import fs from 'node:fs';
import path from 'node:path';

// Ensure environment variables are loaded
if (!process.env.DATABASE_URL) {
  const rootEnv = path.resolve(process.cwd(), '.env');
  const apiEnv = path.resolve(process.cwd(), 'apps/api/.env');
  if (fs.existsSync(rootEnv)) {
    process.loadEnvFile(rootEnv);
  } else if (fs.existsSync(apiEnv)) {
    process.loadEnvFile(apiEnv);
  }
}

import { pool } from './index.js';
import { seedRoles } from './seeds/roles.seed.js';
import { seedAdmin } from './seeds/admin.seed.js';

async function bootstrap() {
  console.log('🚀 Starting system admin bootstrap...');
  try {
    await seedRoles();
    await seedAdmin();
    console.log('🎉 System admin bootstrap completed successfully.');
  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

bootstrap();
