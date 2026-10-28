import { createPublicGymRepository } from '../repositories/public-gym.repository.js';
import type { PublicGymQuery } from '../validators/public-gym.validator.js';
import { AppError } from '../utils/errors.js';

export const createPublicGymService = (repository = createPublicGymRepository()) => {
  const read = async <T>(run: () => Promise<T>) => {
    try { return await run(); }
    catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Không thể đọc thông tin Gym.');
    }
  };
  return {
    list: (query: PublicGymQuery) => read(async () => {
      const { data, totalItems } = await repository.list(query);
      const totalPages = Math.ceil(totalItems / query.pageSize);
      return { data, pagination: { page: query.page, pageSize: query.pageSize, totalItems, totalPages,
        hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
    }),
    detail: (gymId: string) => read(async () => {
      const gym = await repository.findActive(gymId);
      if (!gym) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy Gym công khai.');
      return gym;
    }),
  };
};
export const publicGymService = createPublicGymService();
