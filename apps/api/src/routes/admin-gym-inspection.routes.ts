import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { adminGymInspectionService } from '../services/admin-gym-inspection.service.js';
const params = z.object({ gymId: z.uuid(), resource: z.string().max(40) }).strict();
export const createAdminGymInspectionRouter = (service = adminGymInspectionService) => {
  const router = Router();
  router.get('/admin/gyms/:gymId/inspection/:resource', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); },
    authenticate, async (req, res, next) => {
      try { const p = params.parse(req.params); res.json({ success: true, ...await service.list(req.user!.userId, p.gymId, p.resource, req.query) }); }
      catch (error) { next(error); }
    });
  return router;
};
export const adminGymInspectionRouter = createAdminGymInspectionRouter();
