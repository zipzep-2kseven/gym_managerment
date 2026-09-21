// 1. users, user_profiles, roles, user_roles
export * from './users.js';

// 2. gyms, gym_managers, gym_trainers
export * from './gyms.js';

// 3. packages
export * from './packages.js';

// 4. payments
export * from './payments.js';

// 5. memberships
export * from './memberships.js';

// 6. pt_registrations, pt_appointments
export * from './pt.js';

// 7. equipment_types, equipments
export * from './equipments.js';

// 8. gym_reports
export * from './reports.js';

// 9. relations
export * from './relations.js';

// Inferred TypeScript types for all 15 tables
import type { users, userProfiles, roles, userRoles } from './users.js';
import type { gyms, gymManagers, gymTrainers } from './gyms.js';
import type { packages } from './packages.js';
import type { payments } from './payments.js';
import type { memberships } from './memberships.js';
import type { ptRegistrations, ptAppointments } from './pt.js';
import type { equipmentTypes, equipments } from './equipments.js';
import type { gymReports } from './reports.js';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

export type Gym = typeof gyms.$inferSelect;
export type NewGym = typeof gyms.$inferInsert;

export type GymManager = typeof gymManagers.$inferSelect;
export type NewGymManager = typeof gymManagers.$inferInsert;

export type GymTrainer = typeof gymTrainers.$inferSelect;
export type NewGymTrainer = typeof gymTrainers.$inferInsert;

export type Package = typeof packages.$inferSelect;
export type NewPackage = typeof packages.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;

export type PtRegistration = typeof ptRegistrations.$inferSelect;
export type NewPtRegistration = typeof ptRegistrations.$inferInsert;

export type PtAppointment = typeof ptAppointments.$inferSelect;
export type NewPtAppointment = typeof ptAppointments.$inferInsert;

export type EquipmentType = typeof equipmentTypes.$inferSelect;
export type NewEquipmentType = typeof equipmentTypes.$inferInsert;

export type Equipment = typeof equipments.$inferSelect;
export type NewEquipment = typeof equipments.$inferInsert;

export type GymReport = typeof gymReports.$inferSelect;
export type NewGymReport = typeof gymReports.$inferInsert;
