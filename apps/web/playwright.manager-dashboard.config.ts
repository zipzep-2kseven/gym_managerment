import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'manager-dashboard.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3109', trace: 'off' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 3109 --strictPort',
    url: 'http://127.0.0.1:3109',
    reuseExistingServer: false,
  },
});
