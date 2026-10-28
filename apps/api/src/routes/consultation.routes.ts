import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { config } from '../config/index.js';
import { createConsultationRateLimit } from '../middleware/consultation-rate-limit.js';
import { consultationService } from '../services/consultation.service.js';
const gymParams = z.object({ gymId: z.uuid().transform(v => v.toLowerCase()) }).strict();
const itemParams = gymParams.extend({ requestId: z.uuid().transform(v => v.toLowerCase()) });
export const createConsultationRouter = (service = consultationService, limiter: RequestHandler = createConsultationRateLimit()) => {
  const router = Router();
  const handler = (code: number, fn: (req: Request) => Promise<object>, list = false) => async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    try { const result = await fn(req); res.status(code).json({ success: true, ...(list ? result : { data: result }) }); } catch (error) { next(error); }
  };
  const optionalAuth: RequestHandler = (req, res, next) => req.cookies?.[config.cookie.name] === undefined ? next() : authenticate(req, res, next);
  const path = '/gyms/:gymId/consultation-requests';
  const privateResponse: RequestHandler = (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); };
  router.post(path, privateResponse, limiter, optionalAuth, handler(201, req => service.create(req.user?.userId ?? null, gymParams.parse(req.params).gymId, req.body)));
  router.get(path, privateResponse, authenticate, handler(200, req => service.list(req.user!.userId, gymParams.parse(req.params).gymId, req.query), true));
  router.patch(`${path}/:requestId`, privateResponse, authenticate, handler(200, req => {
    const { gymId, requestId } = itemParams.parse(req.params); return service.update(req.user!.userId, gymId, requestId, req.body);
  }));
  return router;
};
export const consultationRouter = createConsultationRouter();
