import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { createPackageController } from '../controllers/package.controller.js';
import { packageService } from '../services/package.service.js';

export const createPackageRouter = (service = packageService) => {
  const router = Router();
  const controller = createPackageController(service);
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/gyms/:gymId/packages', controller.publicList);
  router.get('/gyms/:gymId/packages/:packageId', controller.publicDetail);
  router.get('/gyms/:gymId/management/packages', authenticate, controller.managedList);
  router.post('/gyms/:gymId/packages', authenticate, controller.create);
  router.patch('/gyms/:gymId/packages/:packageId', authenticate, controller.update);
  router.patch('/gyms/:gymId/packages/:packageId/activate', authenticate, controller.activate);
  router.patch('/gyms/:gymId/packages/:packageId/deactivate', authenticate, controller.deactivate);
  return router;
};
export const packageRouter = createPackageRouter();
