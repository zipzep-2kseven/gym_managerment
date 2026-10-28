import { z } from 'zod';
import { db } from '../database/index.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createGymScopeService } from './gym-scope.service.js';
import { inspectionQueries, createAdminGymInspectionRepository } from '../repositories/admin-gym-inspection.repository.js';
import { staffingDatabaseError } from './staffing-errors.js';
import { AppError } from '../utils/errors.js';
const querySchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20), search: z.string().trim().max(100).optional(),
  status: z.string().regex(/^[A-Z_]{1,30}$/).optional() }).strict();
export const createAdminGymInspectionService = (database: typeof db = db) => ({
  list: async (actor: string, gym: string, resource: string, input: unknown) => {
    const query = querySchema.parse(input), sources = inspectionQueries(gym);
    const source = Object.prototype.hasOwnProperty.call(sources, resource) ? sources[resource] : undefined;
    if (!source) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy nhóm thông tin.');
    return database.transaction(async tx => {
      const staff = createStaffingRepository(tx);
      await createGymScopeService(staff, staff).requireInternalScope(actor, gym, ['ADMIN']);
      const result = await createAdminGymInspectionRepository(tx).list(source, query.page, query.pageSize, query.search, query.status);
      const totalPages = Math.ceil(result.total / query.pageSize);
      return { data: result.data, pagination: { page: query.page, pageSize: query.pageSize, totalItems: result.total,
        totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
    }, { isolationLevel: 'repeatable read' }).catch(staffingDatabaseError);
  },
});
export const adminGymInspectionService = createAdminGymInspectionService();
