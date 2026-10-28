import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { gymManagementService } from '../services/gym-management.service.js';
import { publicGymParamsSchema } from '../validators/public-gym.validator.js';

export const createGymManagementRouter = (service = gymManagementService) => {
  const router = Router();
  const authenticated = [(_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store'); next();
  }, authenticate];
  const handle = (run: (req: Request) => Promise<object>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try { res.json({ success: true, ...await run(req) }); }
      catch (error) { next(error); }
    };
  router.get('/admin/gyms', authenticated, handle(req => service.gyms(req.user!.userId, req.query)));
  router.get('/gyms/:gymId/management/trainers', authenticated, handle(req => service.trainers(
    req.user!.userId, publicGymParamsSchema.parse(req.params).gymId, req.query,
  )));
  return router;
};
export const gymManagementRouter = createGymManagementRouter();
