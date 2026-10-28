import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import base from './playwright.gym-live.config';

const infoPath = fileURLToPath(new URL('./.qa-artifacts/admin-dashboard-fixture.json', import.meta.url));
process.env.ADMIN_DASHBOARD_TEST_DB_INFO = infoPath;
export default defineConfig({
  ...base,
  testMatch: 'admin-dashboard-live.spec.ts',
  retries: 0,
  webServer: Array.isArray(base.webServer) ? base.webServer.map((server, index) => index === 0
    ? { ...server, env: { ...server.env, ADMIN_DASHBOARD_FIXTURE: 'true', BROWSER_FIXTURE_INFO_PATH: infoPath } }
    : server) : base.webServer,
});
