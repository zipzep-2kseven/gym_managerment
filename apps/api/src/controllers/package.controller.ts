import type { Request, Response, NextFunction } from 'express';
import type { packages } from '../database/schema/index.js';
import { packageService } from '../services/package.service.js';
import { packageGymParamsSchema, packageParamsSchema, emptyPackageInputSchema } from '../validators/package.validator.js';
import { UnauthorizedError } from '../utils/errors.js';

const packageDto = (row: typeof packages.$inferSelect) => ({
  package_id: row.packageId, gym_id: row.gymId, package_name: row.packageName,
  description: row.description, duration_days: row.durationDays, price: row.price,
  status: row.status, created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
});
export const createPackageController = (service = packageService) => {
  const action = (status: number, run: (req: Request) => Promise<object>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try { res.status(status).json({ success: true, ...await run(req) }); }
      catch (error) { next(error); }
    };
  const actor = (req: Request) => {
    if (!req.user) throw new UnauthorizedError();
    return req.user.userId;
  };
  const status = (value: 'ACTIVE' | 'INACTIVE') => action(200, async req => {
    const { gymId, packageId } = packageParamsSchema.parse(req.params);
    emptyPackageInputSchema.parse(req.body ?? {});
    emptyPackageInputSchema.parse(req.query);
    return { data: packageDto(await service.setStatus(actor(req), gymId, packageId, value)) };
  });
  return {
    publicList: action(200, req => service.publicList(packageGymParamsSchema.parse(req.params).gymId, req.query)),
    publicDetail: action(200, async req => {
      const { gymId, packageId } = packageParamsSchema.parse(req.params);
      emptyPackageInputSchema.parse(req.query);
      return { data: await service.publicDetail(gymId, packageId) };
    }),
    managedList: action(200, req => service.managedList(actor(req), packageGymParamsSchema.parse(req.params).gymId, req.query)),
    create: action(201, async req => {
      const { gymId } = packageGymParamsSchema.parse(req.params);
      emptyPackageInputSchema.parse(req.query);
      return { data: packageDto(await service.create(actor(req), gymId, req.body)) };
    }),
    update: action(200, async req => {
      const { gymId, packageId } = packageParamsSchema.parse(req.params);
      emptyPackageInputSchema.parse(req.query);
      return { data: packageDto(await service.update(actor(req), gymId, packageId, req.body)) };
    }),
    activate: status('ACTIVE'), deactivate: status('INACTIVE'),
  };
};
