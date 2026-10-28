import { defineConfig } from '@playwright/test';
import base from './playwright.gym-live.config';
export default defineConfig({ ...base, testMatch: ['admin-trainers.spec.ts', 'admin-trainer-intake.spec.ts', 'admin-trainer-lifecycle.spec.ts'], retries: 0,
  webServer: Array.isArray(base.webServer) ? base.webServer.map(server => ({ ...server, env: { ...server.env, ADMIN_TRAINER_LIFECYCLE_FIXTURE: 'true' } })) : base.webServer,
});
