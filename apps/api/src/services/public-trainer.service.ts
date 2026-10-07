import { createPublicTrainerRepository } from '../repositories/public-trainer.repository.js';
import type { PublicTrainerQuery } from '../validators/public-trainer.validator.js';
import { AppError } from '../utils/errors.js';

export const createPublicTrainerService = (repository = createPublicTrainerRepository()) => {
  const read = async <T>(run: () => Promise<T | null>) => {
    try {
      const result = await run();
      if (result === null) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy Gym hoặc PT công khai.');
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Không thể đọc thông tin PT.');
    }
  };
  return {
    list: async (gymId: string, query: PublicTrainerQuery) => {
      const { data, totalItems } = await read(() => repository.list(gymId, query));
      const totalPages = Math.ceil(totalItems / query.pageSize);
      return { data, pagination: { page: query.page, pageSize: query.pageSize, totalItems, totalPages,
        hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
    },
    detail: (gymId: string, trainerId: string) => read(() => repository.detail(gymId, trainerId)),
  };
};
export const publicTrainerService = createPublicTrainerService();
