import { defineConfig } from '@playwright/test';
import base from './playwright.package-live.config';
export default defineConfig({ ...base, testMatch: 'admin-packages*.spec.ts', retries: 0 });
