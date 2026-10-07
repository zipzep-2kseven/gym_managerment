import { verify, hash, Algorithm } from '@node-rs/argon2';
import { eq, and } from 'drizzle-orm';
import { db } from '../database/index.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../database/schema/index.js';
import {
  users,
  roles,
  userRoles,
  userProfiles,
  gymManagers,
  gymTrainers,
} from '../database/schema/index.js';
import { DUMMY_ARGON2_HASH } from '../constants/auth.constants.js';
import {
  AppError,
  ValidationError,
  InvalidCredentialsError,
  AccountDeactivatedError,
  UnauthorizedError,
  InvalidCurrentPasswordError,
  EmailAlreadyExistsError,
  PhoneAlreadyExistsError,
} from '../utils/errors.js';
import { signJwt } from '../utils/jwt.js';
import { LoginInput, ChangePasswordInput, RegisterInput } from '../utils/validators.js';
import { UserSession, LoginResult, ActiveGymAssignment } from '../types/auth.types.js';

export class AuthService {
  constructor(private readonly database: NodePgDatabase<typeof schema> = db) {}

  /**
   * Registers a new Customer account within an atomic database transaction.
   * Creates user, profile, and user_roles (CUSTOMER).
   * Emits JWT auth token and UserSession projection.
   */
  async register(input: RegisterInput): Promise<LoginResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedPhone = input.phone ?? null;

    // 1. Pre-check email uniqueness
    const [existingEmail] = await this.database
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingEmail) {
      throw new EmailAlreadyExistsError();
    }

    // 2. Pre-check phone uniqueness if provided
    if (normalizedPhone) {
      const [existingPhone] = await this.database
        .select({ userId: users.userId })
        .from(users)
        .where(eq(users.phone, normalizedPhone))
        .limit(1);

      if (existingPhone) {
        throw new PhoneAlreadyExistsError();
      }
    }

    // 3. Look up CUSTOMER role
    const [customerRole] = await this.database
      .select()
      .from(roles)
      .where(eq(roles.roleName, 'CUSTOMER'))
      .limit(1);

    if (!customerRole) {
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Vai trò CUSTOMER chưa được cấu hình.');
    }

    // 4. Hash password with Argon2id using standardized configuration
    const passwordHash = await hash(input.password, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 65536,
      timeCost: 3,
      outputLen: 32,
      parallelism: 4,
    });

    try {
      // 5. Execute atomic transaction (users + user_profiles + user_roles)
      const { user, profile } = await this.database.transaction(async (tx) => {
        const [createdUser] = await tx
          .insert(users)
          .values({
            email: normalizedEmail,
            phone: normalizedPhone,
            passwordHash,
            status: 'ACTIVE',
            emailVerifiedAt: null,
            mustChangePassword: false,
          })
          .returning();

        const [createdProfile] = await tx
          .insert(userProfiles)
          .values({
            userId: createdUser.userId,
            fullName: input.full_name.trim(),
          })
          .returning();

        await tx.insert(userRoles).values({
          userId: createdUser.userId,
          roleId: customerRole.roleId,
        });

        return { user: createdUser, profile: createdProfile };
      });

      // 6. Construct UserSession projection
      const session: UserSession = {
        user_id: user.userId,
        email: user.email,
        phone: user.phone,
        email_verified_at: null,
        must_change_password: false,
        status: 'ACTIVE',
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
        profile: {
          profile_id: profile.profileId,
          user_id: profile.userId,
          full_name: profile.fullName,
          date_of_birth: null,
          gender: null,
          address: null,
          avatar_url: null,
          created_at: profile.createdAt.toISOString(),
          updated_at: profile.updatedAt.toISOString(),
        },
        roles: ['CUSTOMER'],
        active_gym_assignments: [],
      };

      // 7. Sign JWT with standardized claims
      const token = signJwt({
        sub: user.userId,
        email: user.email,
        roles: session.roles,
      });

      return { token, session };
    } catch (error: any) {
      // Handle concurrent PostgreSQL unique_violation (code 23505)
      if (error?.code === '23505') {
        if (error.constraint === 'users_email_key' || error.detail?.includes('email')) {
          throw new EmailAlreadyExistsError();
        }
        if (error.constraint === 'users_phone_key' || error.detail?.includes('phone')) {
          throw new PhoneAlreadyExistsError();
        }
      }
      throw error;
    }
  }

  /**
   * Authenticates user with email and password.
   * Enforces constant-time dummy verify when user not found to prevent user enumeration.
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Look up user by email
    const [user] = await this.database
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

    // 5. Build authoritative UserSession from database
    const session = await this.buildUserSession(user);

    // 6. Sign JWT with standardized claims: sub, email, roles
    const token = signJwt({
      sub: user.userId,
      email: user.email,
      roles: session.roles,
    });

    return { token, session };
  }

  /**
   * Loads the current user session projection by user UUID.
   * Authoritative source of truth is always the database, never JWT claims.
   */
  async getCurrentUser(userId: string): Promise<UserSession> {
    // 1. Look up user by UUID
    const [user] = await this.database
      .select()
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedError();
    }

    // 2. Check account status
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw new AccountDeactivatedError();
    }

    // 3. Build authoritative UserSession projection directly from database
    return this.buildUserSession(user);
  }

  /**
   * Builds the UserSession DTO projection from database queries.
   * Ensures password_hash and internal credentials are never exposed.
   */
  private async buildUserSession(user: typeof users.$inferSelect): Promise<UserSession> {
    // 1. Query assigned roles
    const userRoleRows = await this.database
      .select({ roleName: roles.roleName })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.roleId))
      .where(eq(userRoles.userId, user.userId));

    const roleNames = userRoleRows.map((r) => r.roleName);

    // 2. Query user profile (if created)
    const [profile] = await this.database
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.userId))
      .limit(1);

    // 3. Query active gym assignments (manager and/or trainer)
    const managerAssignments = await this.database
      .select({
        gymId: gymManagers.gymId,
        gymManagerId: gymManagers.gymManagerId,
      })
      .from(gymManagers)
      .where(and(eq(gymManagers.userId, user.userId), eq(gymManagers.status, 'ACTIVE')));

    const trainerAssignments = await this.database
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

    // 4. Construct safe UserSession projection (Strictly NO password_hash or sensitive data)
    return {
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
  }

  /**
   * Changes the authenticated user's password.
   * Verifies current password using Argon2id, hashes new password with Argon2id,
   * updates password_hash, resets must_change_password to false, and updates updated_at.
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<{ message: string }> {
    // 1. Look up user by UUID from database
    const [user] = await this.database
      .select()
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedError();
    }

    // 2. Check account status
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw new AccountDeactivatedError();
    }

    // 3. Verify current password
    const isCurrentValid = await verify(user.passwordHash, input.current_password);
    if (!isCurrentValid) {
      throw new InvalidCurrentPasswordError();
    }

    if (input.new_password === input.current_password) {
      throw new ValidationError('Mật khẩu mới phải khác mật khẩu hiện tại.');
    }

    // 4. Hash new password with Argon2id using standardized parameters:
    // memory: 64MB / 65536 KB, iterations (timeCost): 3, parallelism: 4, outputLen: 32
    const newPasswordHash = await hash(input.new_password, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 65536,
      timeCost: 3,
      outputLen: 32,
      parallelism: 4,
    });

    // 5. Update user password_hash, must_change_password, and updated_at atomically
    await this.database
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.userId, user.userId));

    return { message: 'Đổi mật khẩu thành công.' };
  }
}

export const authService = new AuthService();
