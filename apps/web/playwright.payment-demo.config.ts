import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base,
  testMatch: 'payment-demo.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3104', trace: 'off', screenshot: 'off', video: 'off' },
  webServer: [
    { command: '../../node_modules/.bin/tsx ../api/tests/gym-03.browser-fixture.ts', url: 'http://127.0.0.1:4103/health', reuseExistingServer: false,
      env: { PAYMENT_MODE: 'demo', COOKIE_SECURE: 'false', CORS_ORIGIN: 'http://127.0.0.1:3104', NODE_ENV: 'test' }, gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 } },
    { command: 'npm run dev -- --host 127.0.0.1 --port 3104 --strictPort', url: 'http://127.0.0.1:3104', reuseExistingServer: false,
      env: { VITE_API_BASE_URL: 'http://127.0.0.1:4103' } },
  ],
});
