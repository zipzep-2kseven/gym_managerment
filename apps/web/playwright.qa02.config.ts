import { defineConfig } from '@playwright/test';
import base from './playwright.pt-workflow.config';
export default defineConfig({ ...base, testMatch: 'qa02.spec.ts', retries: 0, timeout: 180000 });
