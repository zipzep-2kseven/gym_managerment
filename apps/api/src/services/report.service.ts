import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../database/index.js';
import { gymReports } from '../database/schema/index.js';
import { createReportRepository, reportDto, type ReportTransaction } from '../repositories/report.repository.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createGymScopeService } from './gym-scope.service.js';
import { createReportImageStore } from './report-image-store.js';
import { staffingDatabaseError } from './staffing-errors.js';
import { reportInput, reportNote, reportPage } from '../validators/report.validator.js';
import { AppError, UnauthorizedError, AccountDeactivatedError } from '../utils/errors.js';
const account = async (tx: ReportTransaction, actor: string) => {
  const repo = createStaffingRepository(tx), user = await repo.findAccountState(actor);
  if (!user) throw new UnauthorizedError();
  if (user.status !== 'ACTIVE') throw new AccountDeactivatedError();
  if (user.mustChangePassword) throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Bạn phải đổi mật khẩu trước khi tiếp tục.');
  return repo.findCurrentUserRoles(actor);
};
const internal = (tx: ReportTransaction, actor: string, gymId: string, read = false) => {
  const repo = createStaffingRepository(tx); return createGymScopeService(repo, repo).requireInternalScope(actor, gymId, read ? ['ADMIN', 'MANAGER'] : ['MANAGER']);
};
export const createReportService = (database: typeof db = db, images = createReportImageStore()) => {
  const canCreate = async (tx: ReportTransaction, actor: string, gymId: string) => {
    const repo = createReportRepository(tx), gym = await repo.lockGym(gymId);
    if (!gym || gym.status !== 'ACTIVE') throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy Gym đang hoạt động.');
    if (!(await account(tx, actor)).includes('CUSTOMER') || !(await repo.eligible(actor, gymId))) throw new AppError(403, 'MEMBERSHIP_REQUIRED', 'Bạn cần thẻ hội viên đang hoạt động và còn hạn tại Gym này.');
    return gym;
  };
  return {
    authorizeCreate: (actor: string, gymId: string) => database.transaction(tx => canCreate(tx, actor, gymId)).catch(staffingDatabaseError),
    create: async (actor: string, gymId: string, input: unknown) => {
      const body = reportInput.parse(input), id = randomUUID();
      await database.transaction(tx => canCreate(tx, actor, gymId)).catch(staffingDatabaseError);
      const name = body.image ? await images.save(id, body.image) : null;
      try {
        return await database.transaction(async tx => {
          const gym = await canCreate(tx, actor, gymId);
          const row = await createReportRepository(tx).insert({ reportId: id, gymId, userId: actor, equipmentId: null,
            reportType: 'OTHER', title: body.content.slice(0, 80), content: body.content, imageUrl: name });
          return reportDto(row, gym.gymName);
        });
      } catch (error) {
        // Preserve a file when commit outcome is ambiguous; do not delete a committed report's image.
        if (name) { try { const existing = await database.select({ id: gymReports.reportId }).from(gymReports).where(eq(gymReports.reportId, id)); if (!existing.length) await images.remove(name); } catch { /* Crash/network orphans require operational reconciliation. */ } }
        return staffingDatabaseError(error);
      }
    },
    list: async (actor: string, queryInput: unknown, gymId?: string) => {
      const query = reportPage.parse(queryInput);
      return database.transaction(async tx => {
        if (gymId) await internal(tx, actor, gymId, true); else await account(tx, actor);
        const result = await createReportRepository(tx).list(gymId ? eq(gymReports.gymId, gymId) : eq(gymReports.userId, actor), query);
        const totalPages = Math.ceil(result.total / query.pageSize);
        return { data: result.rows.map(r => reportDto(r.report, r.gymName)), pagination: { ...query, totalItems: result.total, totalPages,
          hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
      }, { isolationLevel: 'repeatable read' }).catch(staffingDatabaseError);
    },
    change: async (actor: string, gymId: string, id: string, action: 'investigate' | 'resolve' | 'reject', input: unknown) => {
      const note = action === 'investigate' ? undefined : reportNote.parse(input).resolution_note;
      return database.transaction(async tx => {
        const repo = createReportRepository(tx), gym = await repo.lockGym(gymId);
        await internal(tx, actor, gymId);
        const found = await repo.find(id), row = found?.report;
        if (!row || row.gymId !== gymId) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy báo cáo.');
        const allowed = action === 'investigate' ? ['PENDING'] : action === 'resolve' ? ['IN_PROGRESS'] : ['PENDING', 'IN_PROGRESS'];
        if (!allowed.includes(row.status)) throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Báo cáo đã được xử lý hoặc trạng thái không phù hợp. Hãy tải lại.');
        const updated = await repo.change(gymId, id, { status: action === 'investigate' ? 'IN_PROGRESS' : action === 'resolve' ? 'RESOLVED' : 'REJECTED',
          ...(note ? { resolutionNote: note, resolvedBy: actor, resolvedAt: action === 'resolve' ? new Date() : null } : {}) });
        return reportDto(updated, gym!.gymName);
      }).catch(staffingDatabaseError);
    },
    image: async (actor: string, id: string) => {
      const name = await database.transaction(async tx => {
        await account(tx, actor);
        const found = await createReportRepository(tx).find(id);
        if (!found || !found.report.imageUrl) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy ảnh báo cáo.');
        if (found.report.userId !== actor) await internal(tx, actor, found.report.gymId, true);
        return found.report.imageUrl;
      }).catch(staffingDatabaseError);
      return images.read(name);
    },
  };
};
export const reportService = createReportService();
