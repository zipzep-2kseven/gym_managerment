import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { createStaffingController } from '../controllers/staffing.controller.js';
import { staffingService } from '../services/staffing.service.js';

export const createStaffingRouter = (service = staffingService) => {
  const router = Router();
  const authenticated = [(_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  }, authenticate];
  const controller = createStaffingController(service);
  router.post('/admin/managers/provision', authenticated, controller.provisionManager);
  router.post('/gyms/:gymId/trainers/provision', authenticated, controller.provisionTrainer);
  router.post('/gyms/:gymId/managers/assign', authenticated, controller.assignManager);
  router.get('/gyms/:gymId/managers', authenticated, controller.listManagers);
  router.post('/gyms/:gymId/managers/:managerId/revoke', authenticated, controller.revokeManager);
  return router;
};
export const staffingRouter = createStaffingRouter();
