import { db } from '../database/index.js';
import { createConsultationRepository, consultationDto } from '../repositories/consultation.repository.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createGymScopeService } from './gym-scope.service.js';
import { staffingDatabaseError } from './staffing-errors.js';
import { consultationInput, consultationPage, consultationUpdate } from '../validators/consultation.validator.js';
import { AccountDeactivatedError, AppError, UnauthorizedError } from '../utils/errors.js';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const manager = (tx: Transaction, actor: string, gymId: string) => {
  const repo = createStaffingRepository(tx);
  return createGymScopeService(repo, repo).requireInternalScope(actor, gymId, ['MANAGER']);
};
export const createConsultationService = (database: typeof db = db) => ({
  create: async (actor: string | null, gymId: string, input: unknown) => {
    const body = consultationInput.parse(input);
    return database.transaction(async tx => {
      const repo = createConsultationRepository(tx), gym = await repo.lockGym(gymId);
      if (!gym || gym.status !== 'ACTIVE') throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy Gym đang hoạt động.');
      if (actor) {
        const user = await createStaffingRepository(tx).findAccountState(actor);
        if (!user) throw new UnauthorizedError();
        if (user.status !== 'ACTIVE') throw new AccountDeactivatedError();
        if (user.mustChangePassword) throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Bạn phải đổi mật khẩu trước khi tiếp tục.');
      }
      await repo.insert({ gymId, userId: actor, fullName: body.full_name, phone: body.phone,
        content: body.content, preferredContact: body.preferred_contact, status: 'PENDING' });
      return { message: 'Gym đã nhận yêu cầu và sẽ liên hệ để tư vấn.' };
    }).catch(staffingDatabaseError);
  },
  list: async (actor: string, gymId: string, input: unknown) => {
    const query = consultationPage.parse(input);
    return database.transaction(async tx => {
      await manager(tx, actor, gymId);
      const { rows, total } = await createConsultationRepository(tx).list(gymId, query), totalPages = Math.ceil(total / query.pageSize);
      return { data: rows.map(consultationDto), pagination: { page: query.page, pageSize: query.pageSize,
        totalItems: total, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
    }, { isolationLevel: 'repeatable read' }).catch(staffingDatabaseError);
  },
  update: async (actor: string, gymId: string, id: string, input: unknown) => {
    const body = consultationUpdate.parse(input);
    return database.transaction(async tx => {
      const repo = createConsultationRepository(tx); await repo.lockGym(gymId);
      await manager(tx, actor, gymId);
      const row = await repo.find(gymId, id);
      if (!row) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu tư vấn.');
      const next: Record<string, string[]> = { PENDING: ['PENDING', 'CONTACTED', 'CANCELLED'], CONTACTED: ['CONTACTED', 'COMPLETED', 'CANCELLED'] };
      if (row.status !== body.expected_status || !next[row.status]?.includes(body.status)) throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Yêu cầu đã thay đổi hoặc kết thúc. Hãy tải lại danh sách.');
      return consultationDto(await repo.change(gymId, id, body.status, body.processing_note));
    }).catch(staffingDatabaseError);
  },
});
export const consultationService = createConsultationService();
