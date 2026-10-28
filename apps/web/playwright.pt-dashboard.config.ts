import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'pt-dashboard.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3111', trace: 'off' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 3111 --strictPort',
    url: 'http://127.0.0.1:3111',
    reuseExistingServer: false,
  },
});
