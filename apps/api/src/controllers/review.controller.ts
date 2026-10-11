import type { Request, Response, NextFunction } from 'express';
import { reviewService, ownReviewView } from '../services/review.service.js';
import { reviewParams, reviewQuery, reviewInput, type ReviewTarget } from '../validators/review.validator.js';
import { z } from 'zod';
const target = (req: Request): ReviewTarget => {
  const p = reviewParams.parse(req.params);
  return p.trainerId ? { kind: 'trainer', id: p.trainerId, gymId: p.gymId } : { kind: 'gym', id: p.gymId };
};
export const createReviewController = (service = reviewService) => ({
  list: async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    try { const q = reviewQuery.parse(req.query); res.json({ success: true, data: await service.list(target(req), q.page, q.pageSize) }); } catch (error) { next(error); }
  },
  mine: async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    try { z.object({}).strict().parse(req.query); res.json({ success: true, data: await service.mine(req.user!.userId, target(req)) }); } catch (error) { next(error); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    try { z.object({}).strict().parse(req.query); const body = reviewInput.parse(req.body); res.status(201).json({ success: true, data: ownReviewView(await service.create(req.user!.userId, target(req), body)) }); } catch (error) { next(error); }
  },
});
