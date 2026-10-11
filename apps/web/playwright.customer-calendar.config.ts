import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base,
  testMatch: 'customer-calendar.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3105', timezoneId: 'America/Los_Angeles', trace: 'off' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 3105 --strictPort', url: 'http://127.0.0.1:3105', reuseExistingServer: false },
});
