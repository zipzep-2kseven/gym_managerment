import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { gymLifecycleService } from '../services/gym-lifecycle.service.js';
import { lifecycleStatusSchema, trainerAssignSchema, trainerRouteSchema } from '../validators/gym-lifecycle.validator.js';
import { gymParamsSchema } from '../validators/staffing.validator.js';
import { assignmentDto } from '../controllers/staffing.controller.js';

export const createGymLifecycleRouter = (service = gymLifecycleService) => {
  const router = Router();
  const handle = (status: number, run: (req: Request) => Promise<unknown>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try { res.status(status).json({ success: true, data: await run(req) }); }
      catch (error) { next(error); }
    };
  const authenticated = [(_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store'); next();
  }, authenticate];
  router.patch('/gyms/:gymId/status', authenticated, handle(200, async req => {
    const { gymId } = gymParamsSchema.parse(req.params);
    const { status } = lifecycleStatusSchema.parse(req.body);
    const row = await service.setGymStatus(req.user!.userId, gymId, status);
    return { gym_id: row.gymId, gym_name: row.gymName, description: row.description,
      phone: row.phone, email: row.email, address: row.address, latitude: row.latitude, longitude: row.longitude,
      logo_url: row.logoUrl, opening_time: row.openingTime, closing_time: row.closingTime,
      status: row.status, created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString() };
  }));
  router.patch('/gyms/:gymId/trainers/:trainerId/status', authenticated, handle(200, async req => {
    const { gymId, trainerId } = trainerRouteSchema.parse(req.params);
    const { status } = lifecycleStatusSchema.parse(req.body);
    return assignmentDto(await service.setTrainerStatus(req.user!.userId, gymId, trainerId, status));
  }));
  router.post('/gyms/:gymId/trainers', authenticated, handle(201, async req => {
    const { gymId } = gymParamsSchema.parse(req.params);
    return assignmentDto(await service.assignTrainer(req.user!.userId, gymId, trainerAssignSchema.parse(req.body)));
  }));
  return router;
};
export const gymLifecycleRouter = createGymLifecycleRouter();
