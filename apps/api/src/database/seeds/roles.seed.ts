import { db } from '../index.js';
import { roles } from '../schema/index.js';

export const systemRoles = [
  {
    roleName: 'ADMIN',
    description: 'Quản trị viên toàn hệ thống',
  },
  {
    roleName: 'MANAGER',
    description: 'Quản lý điều hành chi nhánh phòng tập',
  },
  {
    roleName: 'PT',
    description: 'Huấn luyện viên cá nhân tại phòng tập',
  },
  {
    roleName: 'CUSTOMER',
    description: 'Khách hàng / Hội viên phòng tập',
  },
] as const;

export async function seedRoles() {
  console.log('🌱 Seeding 4 system roles...');

  for (const role of systemRoles) {
    await db
      .insert(roles)
      .values({
        roleName: role.roleName,
        description: role.description,
      })
      .onConflictDoUpdate({
        target: roles.roleName,
        set: {
          description: role.description,
        },
      });
  }

  console.log('✅ System roles seeded successfully.');
}
