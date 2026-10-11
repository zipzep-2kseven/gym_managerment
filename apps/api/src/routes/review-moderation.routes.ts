import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { reviewModerationService } from '../services/review-moderation.service.js';
import { createReviewModerationController } from '../controllers/review-moderation.controller.js';
export const createReviewModerationRouter = (service = reviewModerationService) => {
  const router = Router(), c = createReviewModerationController(service);
  router.get('/admin/reviews', authenticate, c.list); router.patch('/admin/reviews/:kind/:reviewId/hide', authenticate, c.hide); return router;
};
export const reviewModerationRouter = createReviewModerationRouter();
