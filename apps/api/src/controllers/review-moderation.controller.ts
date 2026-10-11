import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { reviewModerationService } from '../services/review-moderation.service.js';
import { moderationParams, hideReviewInput } from '../validators/review.validator.js';
export const createReviewModerationController = (service = reviewModerationService) => ({
  list: async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    try {res.json({success: true, data: await service.list(req.user!.userId, req.query)});} catch (error) {next(error);}
  },
  hide: async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    try {z.object({}).strict().parse(req.query); const p = moderationParams.parse(req.params), body = hideReviewInput.parse(req.body);
      res.json({success: true, data: await service.hideManaged(req.user!.userId, p.kind, p.reviewId, body.hidden_reason)});
    } catch (error) {next(error);}
  },
});
