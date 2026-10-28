import { defineConfig } from '@playwright/test';
import base from './playwright.gym-live.config';
export default defineConfig({ ...base, testMatch: 'admin-memberships.spec.ts', retries: 0,
  webServer: Array.isArray(base.webServer) ? base.webServer.map(server => ({ ...server, env: { ...server.env, ADMIN_MEMBERSHIP_FIXTURE: 'true' } })) : base.webServer,
});
