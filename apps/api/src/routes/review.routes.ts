import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { reviewService } from '../services/review.service.js';
import { createReviewController } from '../controllers/review.controller.js';
export const createReviewRouter = (service = reviewService) => {
  const router = Router(), c = createReviewController(service);
  for (const path of ['/gyms/:gymId/reviews', '/gyms/:gymId/trainers/:trainerId/reviews']) {
    router.get(path, c.list); router.get(`${path}/me`, authenticate, c.mine); router.post(path, authenticate, c.create);
  }
  return router;
};
export const reviewRouter = createReviewRouter();
