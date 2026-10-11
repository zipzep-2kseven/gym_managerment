import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import base from './playwright.pt-workflow.config';
const infoPath = fileURLToPath(new URL('./.qa-artifacts/auth-fixture.json', import.meta.url));
process.env.AUTH_TEST_DB_INFO = infoPath;
export default defineConfig({ ...base, testMatch: 'auth-acceptance.spec.ts', retries: 0,
  webServer: base.webServer && Array.isArray(base.webServer) ? base.webServer.map((server, index) => index === 0
    ? { ...server, env: { ...server.env, BROWSER_FIXTURE_INFO_PATH: infoPath } } : server) : base.webServer,
});
