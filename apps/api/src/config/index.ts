import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Auto-load environment variables if not yet loaded
if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
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
      if (process.env.DATABASE_URL && process.env.JWT_SECRET) break;
    }
  }
}

const nodeEnv = process.env.NODE_ENV || 'development';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (nodeEnv === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is required in production mode.');
    }
    // Safe fallback for local development/testing only
    return 'dev_jwt_secret_fallback_key_multi_gym_2026';
  }
  return secret;
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv,
  isProduction: nodeEnv === 'production',
  jwt: {
    secret: getJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cookie: {
    name: 'auth_token',
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || nodeEnv === 'production',
    sameSite: 'lax' as const,
    path: '/api/v1',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 604800000 ms (7 days)
  },
} as const;
