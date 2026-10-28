import { gymService } from './gym.service';
import { ptService } from './pt.service';
import { adminUserService } from './admin-user.service';
import { ApiClientError } from './api-client';
import type { Status } from '../types/gym.types';

const readAssignment = async (gymId: string, trainerId: string, signal: AbortSignal) => {
  for (let page = 1; ; page++) {
    const result = await gymService.managedTrainers(gymId, { page, pageSize: 100 }, signal);
    const trainer = result.data.find(row => row.gym_trainer_id === trainerId);
    if (trainer) return trainer;
    if (!result.pagination.hasNextPage) throw new ApiClientError(404, 'NOT_FOUND', 'Phân công không còn tại cơ sở này.');
  }
};
const readAccount = async (userId: string, signal: AbortSignal) => {
  // Admin search supports name/email, not UUID. Scan the existing paginated list.
  for (let page = 1; ; page++) {
    const result = await adminUserService.list({ page }, signal);
    const account = result.items.find(row => row.user_id === userId);
    if (account) return account;
    if (page * result.page_size >= result.total) throw new ApiClientError(404, 'NOT_FOUND', 'Tài khoản PT không còn khả dụng.');
  }
};
const readObligations = async (gymId: string, trainerId: string, signal: AbortSignal) => {
  const registrations = new Set<string>(), appointments = new Set<string>();
  for (let page = 1; ; page++) {
    const result = await ptService.registrations(page, gymId, signal);
    for (const row of result.data) if (row.gym_trainer_id === trainerId && row.status === 'ACTIVE') registrations.add(row.registration_id);
    if (!result.pagination.hasNextPage) break;
  }
  for (let page = 1; ; page++) {
    const result = await ptService.appointments(page, gymId, signal);
    for (const row of result.data) if (row.registration.gym_trainer_id === trainerId && ['PENDING', 'CONFIRMED'].includes(row.status)) appointments.add(row.appointment_id);
    if (!result.pagination.hasNextPage) break;
  }
  return { registrations: registrations.size, appointments: appointments.size };
};

export const readTrainerLifecycle = async (gymId: string, trainerId: string, target: Status, signal: AbortSignal) => {
  const [gym, trainer] = await Promise.all([gymService.adminGym(gymId, signal), readAssignment(gymId, trainerId, signal)]);
  if (trainer.status === target) return { gym, trainer, problem: 'Phân công đã ở trạng thái yêu cầu. Hãy làm mới danh sách.', counts: null };
  if (target === 'INACTIVE') {
    const counts = await readObligations(gymId, trainerId, signal);
    return { gym, trainer, counts, problem: counts.registrations || counts.appointments ? 'Còn nghĩa vụ đang mở. Chưa thể ngừng phân công.' : null };
  }
  const account = await readAccount(trainer.user_id, signal);
  const problem = gym.status !== 'ACTIVE' ? 'Cơ sở đang ngừng hoạt động. Không thể kích hoạt PT.'
    : account.status !== 'ACTIVE' ? 'Tài khoản PT chưa hoạt động. Kiểm tra tài khoản trước khi kích hoạt.'
    : !account.roles.includes('PT') ? 'Tài khoản không còn vai trò PT.'
    : account.active_gym_assignments.some(row => row.assignment_type === 'PT' && row.gym_id !== gymId) ? 'PT đang có phân công hoạt động tại cơ sở khác. Không tự chuyển cơ sở.' : null;
  return { gym, trainer, problem, counts: null };
};
