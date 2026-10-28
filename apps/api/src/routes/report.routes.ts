import express, { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { reportService } from '../services/report.service.js';
import { ptEmpty } from '../validators/pt-workflow.validator.js';
const params = z.object({ gymId: z.uuid().transform(v => v.toLowerCase()) }).strict();
const resource = params.extend({ reportId: z.uuid().transform(v => v.toLowerCase()) });
export const createReportRouter = (service = reportService) => {
  const router = Router();
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  const handler = (code: number, fn: (req: Request) => Promise<object>, list = false) => async (req: Request, res: Response, next: NextFunction) => {
    try { const result = await fn(req); res.status(code).json({ success: true, ...(list ? result : { data: result }) }); } catch (error) { next(error); }
  };
  router.post('/gyms/:gymId/reports', authenticate, async (req, _res, next) => {
    try { await service.authorizeCreate(req.user!.userId, params.parse(req.params).gymId); next(); } catch (error) { next(error); }
  }, express.json({ limit: '7mb' }), handler(201, req => service.create(req.user!.userId, params.parse(req.params).gymId, req.body)));
  router.get('/reports/me', authenticate, handler(200, req => service.list(req.user!.userId, req.query), true));
  router.get('/gyms/:gymId/reports', authenticate, handler(200, req => service.list(req.user!.userId, req.query, params.parse(req.params).gymId), true));
  for (const action of ['investigate', 'resolve', 'reject'] as const) router.patch(`/gyms/:gymId/reports/:reportId/${action}`, authenticate, express.json(), handler(200, req => {
    const { gymId, reportId } = resource.parse(req.params); if (action === 'investigate') ptEmpty.parse(req.body ?? {});
    return service.change(req.user!.userId, gymId, reportId, action, req.body);
  }));
  router.get('/reports/:reportId/image', authenticate, async (req, res, next) => {
    try { const id = z.uuid().transform(v => v.toLowerCase()).parse(req.params.reportId), image = await service.image(req.user!.userId, id);
      res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
      res.type(image.mime).send(image.bytes);
    } catch (error) { next(error); }
  });
  return router;
};
export const reportRouter = createReportRouter();
