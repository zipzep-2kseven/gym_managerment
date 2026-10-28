import { defineConfig } from '@playwright/test';
import base from './playwright.package-live.config';
export default defineConfig({ ...base, testMatch: 'admin-gallery*.spec.ts', retries: 0 });
