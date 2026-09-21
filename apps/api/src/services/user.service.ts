import { eq, and, ne } from 'drizzle-orm';
import { db } from '../database/index.js';
import { users, userProfiles } from '../database/schema/index.js';
import {
  UnauthorizedError,
  AccountDeactivatedError,
  PhoneAlreadyExistsError,
  ValidationError,
} from '../utils/errors.js';
import { UpdateProfileInput } from '../utils/validators.js';
import { UserProfileView, UserProfileDto } from '../types/auth.types.js';

export class UserService {
  /**
   * Retrieves the current user's profile view (phone + profile details).
   * Strict ownership: derived only from authenticated user context.
   */
  async getProfile(userId: string): Promise<UserProfileView> {
    // 1. Look up user by UUID
    const [user] = await db
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

    // 3. Query profile record
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    return {
      phone: user.phone,
      profile: profile ? this.mapProfileDto(profile) : null,
    };
  }

  /**
   * Updates the current user's profile and/or phone within a database transaction.
   * Phone is saved to `users.phone` and profile fields to `user_profiles`.
   * Enforces phone uniqueness, ownership, and validation constraints.
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfileView> {
    // 1. Look up user by UUID
    const [user] = await db
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

    // 3. Pre-check phone uniqueness if updating phone to a new non-null value
    if (input.phone !== undefined && input.phone !== null && input.phone !== user.phone) {
      const [existingPhone] = await db
        .select({ userId: users.userId })
        .from(users)
        .where(and(eq(users.phone, input.phone), ne(users.userId, userId)))
        .limit(1);

      if (existingPhone) {
        throw new PhoneAlreadyExistsError();
      }
    }

    try {
      // 4. Execute atomic transaction across users and user_profiles
      const result = await db.transaction(async (tx) => {
        let updatedUser = user;

        // 4a. Update phone on users table if provided
        if (input.phone !== undefined) {
          const [u] = await tx
            .update(users)
            .set({
              phone: input.phone,
              updatedAt: new Date(),
            })
            .where(eq(users.userId, userId))
            .returning();
          updatedUser = u;
        }

        // 4b. Prepare profile fields
        const profileFields: Record<string, any> = {};
        if (input.full_name !== undefined) profileFields.fullName = input.full_name.trim();
        if (input.date_of_birth !== undefined) profileFields.dateOfBirth = input.date_of_birth;
        if (input.gender !== undefined) profileFields.gender = input.gender;
        if (input.address !== undefined) profileFields.address = input.address;
        if (input.avatar_url !== undefined) profileFields.avatarUrl = input.avatar_url;

        // 4c. Check if user already has a profile record
        const [existingProfile] = await tx
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, userId))
          .limit(1);

        let updatedProfile = existingProfile;

        if (existingProfile) {
          if (Object.keys(profileFields).length > 0) {
            const [p] = await tx
              .update(userProfiles)
              .set({
                ...profileFields,
                updatedAt: new Date(),
              })
              .where(eq(userProfiles.userId, userId))
              .returning();
            updatedProfile = p;
          }
        } else {
          // If creating profile for the first time, full_name is required by DB constraint
          if (!input.full_name) {
            throw new ValidationError('Họ và tên là bắt buộc để tạo hồ sơ.');
          }
          const [p] = await tx
            .insert(userProfiles)
            .values({
              userId,
              fullName: input.full_name.trim(),
              dateOfBirth: input.date_of_birth ?? null,
              gender: input.gender ?? null,
              address: input.address ?? null,
              avatarUrl: input.avatar_url ?? null,
            })
            .returning();
          updatedProfile = p;
        }

        return { user: updatedUser, profile: updatedProfile };
      });

      return {
        phone: result.user.phone,
        profile: result.profile ? this.mapProfileDto(result.profile) : null,
      };
    } catch (error: any) {
      // Handle concurrent PostgreSQL unique violation (code 23505) on users_phone_key
      if (error?.code === '23505') {
        if (error.constraint === 'users_phone_key' || error.detail?.includes('phone')) {
          throw new PhoneAlreadyExistsError();
        }
      }
      throw error;
    }
  }

  private mapProfileDto(profile: typeof userProfiles.$inferSelect): UserProfileDto {
    return {
      profile_id: profile.profileId,
      user_id: profile.userId,
      full_name: profile.fullName,
      date_of_birth: profile.dateOfBirth,
      gender: profile.gender,
      address: profile.address,
      avatar_url: profile.avatarUrl,
      created_at: profile.createdAt.toISOString(),
      updated_at: profile.updatedAt.toISOString(),
    };
  }
}

export const userService = new UserService();
