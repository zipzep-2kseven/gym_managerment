import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'customer-dashboard.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3112', trace: 'off' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 3112 --strictPort',
    url: 'http://127.0.0.1:3112',
    reuseExistingServer: false,
  },
});
