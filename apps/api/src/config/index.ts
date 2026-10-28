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

function getCookieSecure(): boolean {
  if (nodeEnv === 'production') {
    // Production MUST always enforce Secure cookies
    return true;
  }
  if (process.env.COOKIE_SECURE !== undefined) {
    return process.env.COOKIE_SECURE === 'true';
  }
  // Default to true according to Security by Default contract
  return true;
}

function getCorsOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGIN;
  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
  if (!envOrigins) return defaults;
  const parsed = envOrigins.split(',').map((s) => s.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : defaults;
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv,
  paymentDemoEnabled: process.env.PAYMENT_MODE === 'demo' && nodeEnv !== 'production',
  isProduction: nodeEnv === 'production',
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
  },
  jwt: {
    secret: getJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cookie: {
    name: 'auth_token',
    httpOnly: true,
    secure: getCookieSecure(),
    sameSite: 'lax' as const,
    path: '/api/v1',
    // maxAge in milliseconds for Express res.cookie(), which serializes to Max-Age=604800 (seconds) in HTTP header
    maxAge: 7 * 24 * 60 * 60 * 1000, // 604,800,000 ms -> HTTP Max-Age=604800
  },
} as const;
