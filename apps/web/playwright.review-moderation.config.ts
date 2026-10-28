import { defineConfig } from '@playwright/test';
import base from './playwright.reviews.config';
export default defineConfig({ ...base, retries: 0, testMatch: 'review-moderation*.spec.ts',
  webServer: Array.isArray(base.webServer) ? base.webServer.map((server, index) => index === 0 ? { ...server, env: { ...server.env, ADMIN_REVIEW_MODERATION_FIXTURE: 'true' } } : server) : base.webServer,
});
