import express, { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { galleryService } from '../services/gallery.service.js';
import { galleryParams, galleryItemParams } from '../validators/gallery.validator.js';
import { ptEmpty } from '../validators/pt-workflow.validator.js';
export const createGalleryRouter = (service = galleryService) => {
  const router = Router();
  const handler = (code: number, fn: (req: Request) => Promise<unknown>) => async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    try { res.status(code).json({ success: true, data: await fn(req) }); } catch (error) { next(error); }
  };
  const path = '/gyms/:gymId/images', privatePath = '/gyms/:gymId/management/images';
  router.get(path, handler(200, req => { ptEmpty.parse(req.query); return service.list(galleryParams.parse(req.params).gymId); }));
  router.get(privatePath, authenticate, handler(200, req => { ptEmpty.parse(req.query); return service.list(galleryParams.parse(req.params).gymId, req.user!.userId); }));
  router.post(path, authenticate, async (req, _res, next) => {
    try { await service.authorizeUpload(req.user!.userId, galleryParams.parse(req.params).gymId); next(); } catch (error) { next(error); }
  }, express.json({ limit: '7mb' }), handler(201, req => service.upload(req.user!.userId, galleryParams.parse(req.params).gymId, req.body)));
  router.patch(`${path}/order`, authenticate, handler(200, req => service.reorder(req.user!.userId, galleryParams.parse(req.params).gymId, req.body)));
  router.patch(`${path}/:imageId`, authenticate, handler(200, req => {
    const { gymId, imageId } = galleryItemParams.parse(req.params); return service.caption(req.user!.userId, gymId, imageId, req.body);
  }));
  router.delete(`${path}/:imageId`, authenticate, handler(200, req => {
    ptEmpty.parse(req.body ?? {}); const { gymId, imageId } = galleryItemParams.parse(req.params); return service.remove(req.user!.userId, gymId, imageId);
  }));
  for (const [url, privateImage] of [[path, false], [privatePath, true]] as const) router.get(`${url}/:imageId/file`, ...(privateImage ? [authenticate] : []), async (req, res, next) => {
    try {
      const { gymId, imageId } = galleryItemParams.parse(req.params), file = await service.image(gymId, imageId, privateImage ? req.user!.userId : undefined);
      res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', privateImage ? 'same-site' : 'cross-origin'); res.type(file.mime).send(file.bytes);
    } catch (error) { next(error); }
  });
  return router;
};
export const galleryRouter = createGalleryRouter();
