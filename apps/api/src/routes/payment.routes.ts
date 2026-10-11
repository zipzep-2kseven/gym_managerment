import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { createPaymentController } from '../controllers/payment.controller.js';
import { paymentService } from '../services/payment.service.js';
export const createPaymentRouter = (service = paymentService) => {
  const router = Router(); const controller = createPaymentController(service);
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.post('/gyms/:gymId/payments', authenticate, controller.create);
  router.get('/payments/me', authenticate, controller.payments);
  router.get('/payments/:paymentId', authenticate, controller.detail);
  router.get('/memberships/me', authenticate, controller.memberships);
  return router;
};
export const paymentRouter = createPaymentRouter();
