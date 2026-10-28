import { defineConfig } from '@playwright/test';
import base from './playwright.pt-workflow.config';
export default defineConfig({ ...base, testMatch: 'reviews.spec.ts', webServer: Array.isArray(base.webServer) ? base.webServer.map((server, index) => index === 0 ? { ...server, env: { ...server.env, REVIEW_FIXTURE: 'true' } } : server) : base.webServer });
