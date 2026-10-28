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

async function runSeed() {
  console.log('🚀 Starting system seed...');
  try {
    // 1. Always ensure 4 system roles exist
    await seedRoles();

    // 2. If bootstrap admin credentials are provided, bootstrap system admin
    if (process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_PASSWORD) {
      await seedAdmin();
    } else {
      console.log('ℹ️ BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD not set. Skipped admin bootstrap.');
    }

    console.log('🎉 Seed process completed successfully.');
  } catch (error) {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSeed();
