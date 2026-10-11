import { db } from '../database/index.js';
import { createPackageRepository } from '../repositories/package.repository.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createGymScopeService } from './gym-scope.service.js';
import { AppError } from '../utils/errors.js';
import { createPackageSchema, updatePackageSchema, publicPackageQuerySchema,
  managedPackageQuerySchema, type PackageQuery } from '../validators/package.validator.js';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const notFound = () => new AppError(404, 'NOT_FOUND', 'Không tìm thấy gói tập.');
const packageDatabaseError = (error: unknown): never => {
  if (error instanceof AppError) throw error;
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    const detail = current as { code?: string; cause?: unknown };
    if (detail.code === '40001' || detail.code === '40P01') {
      throw new AppError(409, 'CONCURRENT_MODIFICATION', 'Dữ liệu đang thay đổi đồng thời; vui lòng thử lại.');
    }
    current = detail.cause;
  }
  throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Không thể xử lý thông tin gói tập.');
};
const paginate = <T>(result: { data: T[]; totalItems: number }, query: PackageQuery) => {
  const totalPages = Math.ceil(result.totalItems / query.pageSize);
  return { data: result.data, pagination: { page: query.page, pageSize: query.pageSize,
    totalItems: result.totalItems, totalPages, hasNextPage: query.page < totalPages,
    hasPreviousPage: query.page > 1 } };
};

export const createPackageService = (database: typeof db = db) => {
  const publicRead = <T>(gymId: string, read: (tx: Transaction) => Promise<T>) =>
    database.transaction(async tx => {
      if (!await createPackageRepository(tx).findPublicGym(gymId)) throw notFound();
      return read(tx);
    }, { isolationLevel: 'repeatable read', accessMode: 'read only' }).catch(packageDatabaseError);

  const internal = <T>(actorId: string, gymId: string, run: (tx: Transaction) => Promise<T>, snapshot = false) =>
    database.transaction(async tx => {
      // Match Gym lifecycle/staffing lock order. Share locks preserve current
      // authorization and allow unrelated packages to be edited concurrently.
      await createPackageRepository(tx).lockGym(gymId);
      const staff = createStaffingRepository(tx);
      await createGymScopeService(staff, staff).requireInternalScope(actorId, gymId, ['ADMIN', 'MANAGER']);
      return run(tx);
    }, { isolationLevel: snapshot ? 'repeatable read' : 'read committed' }).catch(packageDatabaseError);

  return {
    publicList: (gymId: string, input: unknown) => {
      const query = publicPackageQuerySchema.parse(input);
      return publicRead(gymId, async tx => paginate(await createPackageRepository(tx).list(gymId, query, true), query));
    },
    publicDetail: (gymId: string, packageId: string) => publicRead(gymId, async tx => {
      const row = await createPackageRepository(tx).publicDetail(gymId, packageId);
      if (!row) throw notFound();
      return row;
    }),
    managedList: (actorId: string, gymId: string, input: unknown) => {
      const query = managedPackageQuerySchema.parse(input);
      return internal(actorId, gymId, async tx => paginate(await createPackageRepository(tx).list(gymId, query, false), query), true);
    },
    create: (actorId: string, gymId: string, input: unknown) => {
      const parsed = createPackageSchema.parse(input);
      return internal(actorId, gymId, tx => createPackageRepository(tx).create(gymId, parsed));
    },
    update: (actorId: string, gymId: string, packageId: string, input: unknown) => {
      const parsed = updatePackageSchema.parse(input);
      return internal(actorId, gymId, async tx => {
        const row = await createPackageRepository(tx).update(gymId, packageId, parsed);
        if (!row) throw notFound();
        return row;
      });
    },
    setStatus: (actorId: string, gymId: string, packageId: string, status: 'ACTIVE' | 'INACTIVE') =>
      internal(actorId, gymId, async tx => {
        const row = await createPackageRepository(tx).setStatus(gymId, packageId, status);
        if (!row) throw notFound();
        return row;
      }),
  };
};
export const packageService = createPackageService();
