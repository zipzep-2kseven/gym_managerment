import { hash, Algorithm } from '@node-rs/argon2';
import { eq, and } from 'drizzle-orm';
import { db } from '../index.js';
import { users, roles, userRoles } from '../schema/index.js';

export async function seedAdmin() {
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'Bootstrap Admin failed: Missing required environment variables BOOTSTRAP_ADMIN_EMAIL and/or BOOTSTRAP_ADMIN_PASSWORD.'
    );
  }

  // Validate email format
  if (!adminEmail.includes('@') || adminEmail.length > 254) {
    throw new Error(`Bootstrap Admin failed: Invalid email address format: "${adminEmail}"`);
  }

  // Validate password length (Feature Spec: password 8-128 chars)
  if (adminPassword.length < 8 || adminPassword.length > 128) {
    throw new Error('Bootstrap Admin failed: Password length must be between 8 and 128 characters.');
  }

  console.log(`🌱 Checking bootstrap system admin account: ${adminEmail}...`);

  await db.transaction(async (tx) => {
    // 1. Lookup ADMIN role from roles table (Never hardcode UUID)
    const [adminRole] = await tx
      .select()
      .from(roles)
      .where(eq(roles.roleName, 'ADMIN'))
      .limit(1);

    if (!adminRole) {
      throw new Error(
        'Bootstrap Admin failed: Role "ADMIN" not found in database. Ensure roles are seeded first.'
      );
    }

    // 2. Check if a user with this email already exists
    const [existingUser] = await tx
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (!existingUser) {
      // Case A: Admin user does not exist -> Create user and assign ADMIN role
      const passwordHash = await hash(adminPassword, {
        algorithm: Algorithm.Argon2id,
      });

      const [newUser] = await tx
        .insert(users)
        .values({
          email: adminEmail,
          passwordHash,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          mustChangePassword: false,
        })
        .returning();

      await tx.insert(userRoles).values({
        userId: newUser.userId,
        roleId: adminRole.roleId,
      });

      console.log(`✅ System admin user created successfully with ADMIN role.`);
    } else {
      // Check if existing user already has ADMIN role
      const [existingUserRole] = await tx
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, existingUser.userId),
            eq(userRoles.roleId, adminRole.roleId)
          )
        )
        .limit(1);

      if (existingUserRole) {
        // Case B: Admin exists and already has ADMIN role -> Idempotent no-op
        console.log(`ℹ️ System admin user (${adminEmail}) already exists with ADMIN role. No action taken.`);
      } else {
        // Case C: Admin user exists but lacks ADMIN role -> Assign ADMIN role
        await tx.insert(userRoles).values({
          userId: existingUser.userId,
          roleId: adminRole.roleId,
        });
        console.log(`✅ Assigned ADMIN role to existing user (${adminEmail}).`);
      }
    }
  });
}
