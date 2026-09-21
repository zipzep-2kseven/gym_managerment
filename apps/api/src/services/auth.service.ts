import { verify } from '@node-rs/argon2';
import { eq, and } from 'drizzle-orm';
import { db } from '../database/index.js';
import {
  users,
  roles,
  userRoles,
  userProfiles,
  gymManagers,
  gymTrainers,
} from '../database/schema/index.js';
import { DUMMY_ARGON2_HASH } from '../constants/auth.constants.js';
import { InvalidCredentialsError, AccountDeactivatedError } from '../utils/errors.js';
import { signJwt } from '../utils/jwt.js';
import { LoginInput } from '../utils/validators.js';
import { UserSession, LoginResult, ActiveGymAssignment } from '../types/auth.types.js';

export class AuthService {
  /**
   * Authenticates user with email and password.
   * Enforces constant-time dummy verify when user not found to prevent user enumeration.
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Look up user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // 2. If user does not exist, run dummy verification to defeat timing side-channel attacks
    if (!user) {
      await verify(DUMMY_ARGON2_HASH, input.password).catch(() => false);
      throw new InvalidCredentialsError();
    }

    // 3. Verify password hash using Argon2id
    const isPasswordValid = await verify(user.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    // 4. Check account status
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw new AccountDeactivatedError();
    }

    // 5. Query assigned roles
    const userRoleRows = await db
      .select({ roleName: roles.roleName })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.roleId))
      .where(eq(userRoles.userId, user.userId));

    const roleNames = userRoleRows.map((r) => r.roleName);

    // 6. Query user profile (if created)
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.userId))
      .limit(1);

    // 7. Query active gym assignments (manager and/or trainer)
    const managerAssignments = await db
      .select({
        gymId: gymManagers.gymId,
        gymManagerId: gymManagers.gymManagerId,
      })
      .from(gymManagers)
      .where(and(eq(gymManagers.userId, user.userId), eq(gymManagers.status, 'ACTIVE')));

    const trainerAssignments = await db
      .select({
        gymId: gymTrainers.gymId,
        gymTrainerId: gymTrainers.gymTrainerId,
      })
      .from(gymTrainers)
      .where(and(eq(gymTrainers.userId, user.userId), eq(gymTrainers.status, 'ACTIVE')));

    const activeGymAssignments: ActiveGymAssignment[] = [
      ...managerAssignments.map((m) => ({
        assignment_type: 'MANAGER' as const,
        gym_id: m.gymId,
        gym_manager_id: m.gymManagerId,
      })),
      ...trainerAssignments.map((t) => ({
        assignment_type: 'PT' as const,
        gym_id: t.gymId,
        gym_trainer_id: t.gymTrainerId,
      })),
    ];

    // 8. Sign JWT with standardized claims: sub, email, roles
    const token = signJwt({
      sub: user.userId,
      email: user.email,
      roles: roleNames,
    });

    // 9. Construct safe UserSession projection (Strictly NO password_hash)
    const session: UserSession = {
      user_id: user.userId,
      email: user.email,
      phone: user.phone,
      email_verified_at: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      must_change_password: user.mustChangePassword,
      status: user.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
      profile: profile
        ? {
            profile_id: profile.profileId,
            user_id: profile.userId,
            full_name: profile.fullName,
            date_of_birth: profile.dateOfBirth,
            gender: profile.gender,
            address: profile.address,
            avatar_url: profile.avatarUrl,
            created_at: profile.createdAt.toISOString(),
            updated_at: profile.updatedAt.toISOString(),
          }
        : null,
      roles: roleNames,
      active_gym_assignments: activeGymAssignments,
    };

    return { token, session };
  }
}

export const authService = new AuthService();
