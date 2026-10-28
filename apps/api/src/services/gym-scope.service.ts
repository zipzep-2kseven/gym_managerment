import { gymRepository } from '../repositories/gym.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { AccountDeactivatedError, AppError, UnauthorizedError } from '../utils/errors.js';

export type GymScopeRole = 'ADMIN' | 'MANAGER' | 'PT';
export type PublicGymScope = {
  access: 'PUBLIC';
  userId: null;
  gymId: string;
  role: null;
};
export type InternalGymScope = {
  access: 'INTERNAL';
  userId: string;
  gymId: string;
  gymStatus: string;
} & (
  | { role: 'ADMIN'; assignmentId: null }
  | { role: 'MANAGER' | 'PT'; assignmentId: string }
);

export const createGymScopeService = (
  users: typeof userRepository = userRepository,
  gyms: typeof gymRepository = gymRepository,
) => ({
  // Public discovery only: no authenticated actor or internal data is implied.
  requirePublicScope: async (gymId: string): Promise<PublicGymScope> => {
    const gym = await gyms.findById(gymId);
    if (!gym || gym.status !== 'ACTIVE') {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy Gym công khai.');
    }
    return { access: 'PUBLIC', userId: null, gymId: gym.gymId, role: null };
  },

  /**
   * userId must be the authenticated identity. allowedRoles is a server-defined
   * operation policy, never request/JWT roles. Omit it only for general scope checks.
   * This proves Gym scope, not resource ownership or permission for every operation.
   */
  requireInternalScope: async (
    userId: string,
    gymId: string,
    allowedRoles: readonly GymScopeRole[] = ['ADMIN', 'MANAGER', 'PT'],
  ): Promise<InternalGymScope> => {
    const account = await users.findAccountState(userId);
    if (!account) throw new UnauthorizedError();
    if (account.status !== 'ACTIVE') throw new AccountDeactivatedError();
    if (account.mustChangePassword) {
      throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Bạn phải đổi mật khẩu trước khi tiếp tục.');
    }

    const roles = await users.findCurrentUserRoles(userId);
    const gym = await gyms.findById(gymId);
    if (!gym) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy Gym.');

    // Domain Rules §4: Admin has system scope. Gym lifecycle restrictions remain
    // operation-specific (API Spec Gym status / Q-13), not a blanket scope denial.
    const scope = { access: 'INTERNAL' as const, userId, gymId: gym.gymId, gymStatus: gym.status };
    const currentRoles = (['ADMIN', 'MANAGER', 'PT'] as const).filter((role) => roles.includes(role));
    if (!currentRoles.length) {
      throw new AppError(403, 'INSUFFICIENT_ROLE', 'Tài khoản không có vai trò nội bộ Gym.');
    }
    const eligibleRoles = currentRoles.filter((role) => allowedRoles.includes(role));
    if (!eligibleRoles.length) {
      throw new AppError(403, 'GYM_SCOPE_FORBIDDEN', 'Vai trò không phù hợp với thao tác này.', {
        reason: 'INSUFFICIENT_SCOPE',
      });
    }
    if (eligibleRoles.includes('ADMIN')) return { ...scope, role: 'ADMIN', assignmentId: null };
    if (eligibleRoles.includes('MANAGER')) {
      const assignment = await gyms.findActiveManagerAssignment(userId, gymId);
      if (assignment) return { ...scope, role: 'MANAGER', assignmentId: assignment.gymManagerId };
    }
    if (eligibleRoles.includes('PT')) {
      const assignment = await gyms.findActiveTrainerAssignment(userId, gymId);
      if (assignment) return { ...scope, role: 'PT', assignmentId: assignment.gymTrainerId };
    }
    throw new AppError(403, 'GYM_SCOPE_FORBIDDEN', 'Không có phân công ACTIVE tại Gym này.', {
      reason: 'ASSIGNMENT_MISSING_OR_INACTIVE',
    });
  },
});

export const gymScopeService = createGymScopeService();
