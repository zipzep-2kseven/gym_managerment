import { Router, type Request, type Response, type NextFunction } from 'express';
import { publicGymService } from '../services/public-gym.service.js';
import { publicGymParamsSchema, publicGymQuerySchema } from '../validators/public-gym.validator.js';

export const createPublicGymRouter = (service = publicGymService) => {
  const router = Router();
  const handle = (run: (req: Request) => Promise<object>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      // Recheck visibility on every request; do not serve a cached inactive Gym.
      res.setHeader('Cache-Control', 'no-store');
      try { res.json({ success: true, ...await run(req) }); }
      catch (error) { next(error); }
    };
  router.get('/gyms', handle(req => service.list(publicGymQuerySchema.parse(req.query))));
  router.get('/gyms/:gymId', handle(async req => ({
    data: await service.detail(publicGymParamsSchema.parse(req.params).gymId),
  })));
  return router;
};
export const publicGymRouter = createPublicGymRouter();
