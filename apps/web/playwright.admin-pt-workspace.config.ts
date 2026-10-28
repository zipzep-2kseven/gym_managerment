import { defineConfig } from '@playwright/test';
import base from './playwright.package-live.config';
const servers = base.webServer as import('@playwright/test').PlaywrightTestConfig['webServer'];
export default defineConfig({ ...base, testMatch: 'admin-pt-workspace*.spec.ts', retries: 0,
  webServer: Array.isArray(servers) ? servers.map((server, index) => index === 0
    ? { ...server, env: { ...server.env, ADMIN_PT_WORKSPACE_FIXTURE: 'true' } } : server) : servers,
});
