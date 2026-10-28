import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { trainerProfileService } from '../services/trainer-profile.service.js';
import { ptEmpty } from '../validators/pt-workflow.validator.js';
const params = z.object({ gymId: z.uuid().transform(v => v.toLowerCase()), trainerId: z.uuid().transform(v => v.toLowerCase()) }).strict();
export const createTrainerProfileRouter = (service = trainerProfileService) => {
  const router = Router();
  const handler = (fn: (req: Request) => Promise<unknown>) => async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store'); try { res.json({ success: true, data: await fn(req) }); } catch (error) { next(error); }
  };
  router.get('/trainer-profile/me', authenticate, handler(req => { ptEmpty.parse(req.query); return service.mine(req.user!.userId); }));
  router.put('/trainer-profile/me', authenticate, handler(req => service.saveMine(req.user!.userId, req.body)));
  const path = '/gyms/:gymId/management/trainers/:trainerId/profile';
  router.get(path, authenticate, handler(req => { ptEmpty.parse(req.query); const p = params.parse(req.params); return service.managed(req.user!.userId, p.gymId, p.trainerId); }));
  router.patch(path, authenticate, handler(req => { const p = params.parse(req.params); return service.saveManaged(req.user!.userId, p.gymId, p.trainerId, req.body); }));
  return router;
};
export const trainerProfileRouter = createTrainerProfileRouter();
