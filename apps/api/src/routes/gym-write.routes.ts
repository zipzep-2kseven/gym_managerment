import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { gymWriteService } from '../services/gym-write.service.js';
import { publicGymParamsSchema } from '../validators/public-gym.validator.js';
import type { Gym } from '../database/schema/index.js';

const gymDto = (row: Gym) => ({
  gym_id: row.gymId, gym_name: row.gymName, description: row.description, phone: row.phone,
  email: row.email, address: row.address, latitude: row.latitude, longitude: row.longitude,
  logo_url: row.logoUrl, opening_time: row.openingTime, closing_time: row.closingTime,
  status: row.status, created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
});
export const createGymWriteRouter = (service = gymWriteService) => {
  const router = Router();
  const authenticated = [(_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store'); next();
  }, authenticate];
  const handle = (status: number, run: (req: Request) => Promise<Gym>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try { res.status(status).json({ success: true, data: gymDto(await run(req)) }); }
      catch (error) { next(error); }
    };
  router.post('/gyms', authenticated, handle(201, req => service.create(req.user!.userId, req.body)));
  router.patch('/gyms/:gymId', authenticated, handle(200, req =>
    service.update(req.user!.userId, publicGymParamsSchema.parse(req.params).gymId, req.body)));
  return router;
};
export const gymWriteRouter = createGymWriteRouter();
