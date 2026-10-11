import { db } from '../database/index.js';
import { createTrainerProfileRepository, type TrainerProfileTx } from '../repositories/trainer-profile.repository.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createGymScopeService } from './gym-scope.service.js';
import { staffingDatabaseError } from './staffing-errors.js';
import { trainerOwnInput, trainerManagedInput } from '../validators/trainer-profile.validator.js';
import { AppError } from '../utils/errors.js';
const scope = (tx: TrainerProfileTx, actor: string, gym: string, role: 'PT' | 'MANAGER') => {
  const repo = createStaffingRepository(tx); return createGymScopeService(repo, repo).requireInternalScope(actor, gym, [role]);
};
const own = async (tx: TrainerProfileTx, actor: string, write = false) => {
  const repo = createTrainerProfileRepository(tx), row = await repo.own(actor);
  if (!row) throw new AppError(403, 'TRAINER_ASSIGNMENT_REQUIRED', 'Bạn cần phân công PT đang hoạt động.');
  if (write) await repo.lockGym(row.gymId);
  const permission = await scope(tx, actor, row.gymId, 'PT'), current = await repo.find(row.gymId, row.gymTrainerId);
  if (!current || current.userId !== actor || current.status !== 'ACTIVE' || (write && permission.gymStatus !== 'ACTIVE')) throw new AppError(403, 'TRAINER_INACTIVE', 'Gym hoặc phân công PT không còn hoạt động.');
  return current;
};
const stale = (current: string, expected: string) => { if (current !== expected) throw new AppError(409, 'PROFILE_CHANGED', 'Hồ sơ đã thay đổi. Hãy tải lại trước khi lưu.'); };
export const createTrainerProfileService = (database: typeof db = db) => ({
  mine: (actor: string) => database.transaction(async tx => { const row = await own(tx, actor); return createTrainerProfileRepository(tx).view(row.gymId, row.gymTrainerId); }).catch(staffingDatabaseError),
  saveMine: async (actor: string, input: unknown) => {
    const body = trainerOwnInput.parse(input);
    return database.transaction(async tx => {
      const row = await own(tx, actor, true), repo = createTrainerProfileRepository(tx); stale(row.updatedAt.toISOString(), body.expected_updated_at);
      await repo.saveChildren(row.gymTrainerId, body); await repo.update(row.gymId, row.gymTrainerId, { bio: body.bio });
      return repo.view(row.gymId, row.gymTrainerId);
    }).catch(staffingDatabaseError);
  },
  managed: (actor: string, gym: string, id: string) => database.transaction(async tx => {
    await scope(tx, actor, gym, 'MANAGER'); const result = await createTrainerProfileRepository(tx).view(gym, id);
    if (!result) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy PT tại Gym này.'); return result;
  }).catch(staffingDatabaseError),
  saveManaged: async (actor: string, gym: string, id: string, input: unknown) => {
    const body = trainerManagedInput.parse(input);
    return database.transaction(async tx => {
      const repo = createTrainerProfileRepository(tx); await repo.lockGym(gym); const permission = await scope(tx, actor, gym, 'MANAGER');
      const row = await repo.find(gym, id); if (!row) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy PT tại Gym này.');
      if (row.status !== 'ACTIVE' || permission.gymStatus !== 'ACTIVE') throw new AppError(403, 'TRAINER_INACTIVE', 'Gym và PT cần đang hoạt động để sửa hồ sơ.');
      stale(row.updatedAt.toISOString(), body.expected_updated_at);
      await repo.update(gym, id, { specialization: body.specialization, experienceYears: body.experience_years }); return repo.view(gym, id);
    }).catch(staffingDatabaseError);
  },
});
export const trainerProfileService = createTrainerProfileService();
