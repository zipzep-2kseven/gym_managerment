import { AppError } from '../utils/errors.js';

// Never forward ORM errors: they can embed SQL parameters, including password hashes.
export const staffingDatabaseError = (error: unknown): never => {
  if (error instanceof AppError) throw error;
  let current: unknown = error;
  for (let i = 0; i < 5 && current && typeof current === 'object'; i++) {
    const record = current as { code?: string; constraint?: string; cause?: unknown; detail?: string };
    const codes: Record<string, string> = {
      gym_trainers_active_user_key: 'USER_ALREADY_ACTIVE_TRAINER',
      gym_trainers_gym_user_key: 'ASSIGNMENT_ALREADY_EXISTS',
      users_email_key: 'EMAIL_ALREADY_EXISTS', users_phone_key: 'PHONE_ALREADY_EXISTS',
      gym_managers_active_gym_key: 'GYM_ALREADY_HAS_ACTIVE_MANAGER',
      gym_managers_active_user_key: 'USER_ALREADY_ACTIVE_MANAGER',
      gym_managers_gym_user_key: 'ASSIGNMENT_ALREADY_EXISTS',
    };
    if (record.code === '23505' && record.constraint && codes[record.constraint]) {
      throw new AppError(409, codes[record.constraint], 'Thông tin tài khoản hoặc phân công bị trùng.');
    }
    const lifecycle: Record<string, string> = {
      gym_lifecycle_inactive: 'GYM_INACTIVE', trainer_lifecycle_inactive: 'TRAINER_INACTIVE',
      gym_lifecycle_open_obligations: 'GYM_HAS_OPEN_OBLIGATIONS',
      trainer_lifecycle_open_obligations: 'TRAINER_HAS_OPEN_OBLIGATIONS',
    };
    if (record.code === '23514' && record.constraint && lifecycle[record.constraint]) {
      let details: Record<string, number> | undefined;
      if (record.constraint.endsWith('open_obligations') && record.detail) {
        try {
          const parsed = JSON.parse(record.detail);
          details = Object.fromEntries(['payments', 'memberships', 'registrations', 'appointments']
            .map(key => [key, Number.isSafeInteger(parsed[key]) && parsed[key] >= 0 ? parsed[key] : 0]));
        } catch { /* Never expose raw SQL/error details. */ }
      }
      throw new AppError(409, lifecycle[record.constraint], 'Trạng thái hoặc nghĩa vụ đang mở không cho phép thao tác.', details);
    }
    if (record.code === '40P01' || record.code === '40001') {
      throw new AppError(409, 'CONCURRENT_MODIFICATION', 'Dữ liệu đang thay đổi đồng thời; vui lòng thử lại.');
    }
    current = record.cause;
  }
  throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Không thể hoàn tất thao tác.');
};

