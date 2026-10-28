import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { adminDashboardService } from '../services/admin-dashboard.service.js';
export const createAdminDashboardRouter = (service = adminDashboardService) => {
  const router = Router();
  router.get('/admin/dashboard', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); },
    authenticate, async (req, res, next) => {
      try { res.json({ success: true, data: await service.summary(req.user!.userId) }); }
      catch (error) { next(error); }
    });
  return router;
};
export const adminDashboardRouter = createAdminDashboardRouter();
