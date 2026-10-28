import { Router, type Request, type Response, type NextFunction } from 'express';
import { publicTrainerService } from '../services/public-trainer.service.js';
import { publicTrainerParamsSchema, publicTrainerQuerySchema } from '../validators/public-trainer.validator.js';
import { publicGymParamsSchema } from '../validators/public-gym.validator.js';

export const createPublicTrainerRouter = (service = publicTrainerService) => {
  const router = Router();
  const handle = (run: (req: Request) => Promise<object>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Cache-Control', 'no-store');
      try { res.json({ success: true, ...await run(req) }); }
      catch (error) { next(error); }
    };
  router.get('/gyms/:gymId/trainers', handle(req => service.list(
    publicGymParamsSchema.parse(req.params).gymId, publicTrainerQuerySchema.parse(req.query),
  )));
  router.get('/gyms/:gymId/trainers/:trainerId', handle(async req => {
    const { gymId, trainerId } = publicTrainerParamsSchema.parse(req.params);
    return { data: await service.detail(gymId, trainerId) };
  }));
  return router;
};
export const publicTrainerRouter = createPublicTrainerRouter();
