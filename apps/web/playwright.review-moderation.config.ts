import { defineConfig } from '@playwright/test';
import base from './playwright.reviews.config';
export default defineConfig({...base, testMatch: 'review-moderation.spec.ts'});
