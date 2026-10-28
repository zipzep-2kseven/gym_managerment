import { defineConfig } from '@playwright/test';
import base from './playwright.pt-workflow.config';
export default defineConfig({ ...base, testMatch: 'consultation.spec.ts' });
