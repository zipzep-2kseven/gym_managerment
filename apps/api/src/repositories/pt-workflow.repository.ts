import { and, asc, count, desc, eq, inArray, lt, gt, ne, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { db } from '../database/index.js';
import { gyms, users, userProfiles, packages, memberships, gymTrainers, ptRegistrations, ptAppointments } from '../database/schema/index.js';
import type { PtPage } from '../validators/pt-workflow.validator.js';
export type PtTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const customerProfile = alias(userProfiles, 'pt_customer_profile');
const trainerProfile = alias(userProfiles, 'pt_trainer_profile');
const selection = { registration: ptRegistrations, membership: memberships, trainer: gymTrainers,
  customerName: customerProfile.fullName, customerAvatar: customerProfile.avatarUrl,
  trainerName: trainerProfile.fullName, trainerAvatar: trainerProfile.avatarUrl,
  gymName: gyms.gymName };
export const createPtWorkflowRepository = (tx: PtTransaction) => {
  const registrations = () => tx.select(selection).from(ptRegistrations)
    .innerJoin(memberships, eq(memberships.membershipId, ptRegistrations.membershipId))
    .innerJoin(gymTrainers, and(eq(gymTrainers.gymTrainerId, ptRegistrations.gymTrainerId), eq(gymTrainers.gymId, memberships.gymId)))
    .innerJoin(gyms, eq(gyms.gymId, memberships.gymId))
    .leftJoin(customerProfile, eq(customerProfile.userId, memberships.userId))
    .leftJoin(trainerProfile, eq(trainerProfile.userId, gymTrainers.userId));
  const appointments = () => tx.select({ ...selection, appointment: ptAppointments }).from(ptAppointments)
    .innerJoin(ptRegistrations, eq(ptRegistrations.registrationId, ptAppointments.registrationId))
    .innerJoin(memberships, eq(memberships.membershipId, ptRegistrations.membershipId))
    .innerJoin(gymTrainers, and(eq(gymTrainers.gymTrainerId, ptRegistrations.gymTrainerId), eq(gymTrainers.gymId, memberships.gymId)))
    .innerJoin(gyms, eq(gyms.gymId, memberships.gymId))
    .leftJoin(customerProfile, eq(customerProfile.userId, memberships.userId))
    .leftJoin(trainerProfile, eq(trainerProfile.userId, gymTrainers.userId));
  return {
    listMemberships: async (gymId: string, query: PtPage) => {
      const filter = eq(memberships.gymId, gymId);
      const [{ total }] = await tx.select({ total: count() }).from(memberships).where(filter);
      const rows = await tx.select({ membership: memberships, fullName: userProfiles.fullName, gymName: gyms.gymName, packageName: packages.packageName }).from(memberships)
        .innerJoin(gyms, eq(gyms.gymId, memberships.gymId)).innerJoin(packages, and(eq(packages.packageId, memberships.packageId), eq(packages.gymId, gymId)))
        .leftJoin(userProfiles, eq(userProfiles.userId, memberships.userId)).where(filter)
        .orderBy(desc(memberships.createdAt), asc(memberships.membershipId)).limit(query.pageSize).offset((query.page - 1) * query.pageSize);
      return { rows, total };
    },
    lockGym: async (id: string) => (await tx.select().from(gyms).where(eq(gyms.gymId, id)).for('no key update'))[0],
    lockUsers: async (ids: string[]) => {
      for (const id of [...new Set(ids)].sort()) await tx.select({ id: users.userId }).from(users).where(eq(users.userId, id)).for('update');
    },
    membership: async (gymId: string, id: string) => (await tx.select().from(memberships).where(and(eq(memberships.gymId, gymId), eq(memberships.membershipId, id))).for('update'))[0],
    trainer: async (gymId: string, id: string) => (await tx.select().from(gymTrainers).where(and(eq(gymTrainers.gymId, gymId), eq(gymTrainers.gymTrainerId, id))).for('share'))[0],
    registration: async (gymId: string, id: string) => (await registrations().where(and(eq(memberships.gymId, gymId), eq(ptRegistrations.registrationId, id))))[0],
    appointment: async (gymId: string, id: string) => (await appointments().where(and(eq(memberships.gymId, gymId), eq(ptAppointments.appointmentId, id))))[0],
    activeRegistration: async (gymId: string, id: string) => (await registrations().where(and(eq(memberships.gymId, gymId), eq(memberships.membershipId, id), eq(ptRegistrations.status, 'ACTIVE'))))[0],
    insertRegistration: async (input: typeof ptRegistrations.$inferInsert) => (await tx.insert(ptRegistrations).values(input).returning())[0],
    cancelRegistration: async (gymId: string, id: string, note: string) => tx.update(ptRegistrations).set({ status: 'CANCELLED', note, updatedAt: sql`clock_timestamp()` })
      .where(and(eq(ptRegistrations.registrationId, id), inArray(ptRegistrations.membershipId, tx.select({ id: memberships.membershipId }).from(memberships).where(eq(memberships.gymId, gymId))))),
    hasOpen: async (gymId: string, id: string) => (await appointments().where(and(eq(memberships.gymId, gymId), eq(ptRegistrations.registrationId, id), inArray(ptAppointments.status, ['PENDING', 'CONFIRMED']))).limit(1)).length > 0,
    insertAppointment: async (input: typeof ptAppointments.$inferInsert) => (await tx.insert(ptAppointments).values(input).returning())[0],
    updateAppointment: async (gymId: string, id: string, input: Partial<typeof ptAppointments.$inferInsert>) => tx.update(ptAppointments).set({ ...input, updatedAt: sql`clock_timestamp()` })
      .where(and(eq(ptAppointments.appointmentId, id), inArray(ptAppointments.registrationId, tx.select({ id: ptRegistrations.registrationId }).from(ptRegistrations)
        .innerJoin(memberships, eq(memberships.membershipId, ptRegistrations.membershipId)).where(eq(memberships.gymId, gymId))))),
    availability: async (gymId: string, id: string, availability: string) => tx.update(gymTrainers).set({ availability, updatedAt: sql`clock_timestamp()` })
      .where(and(eq(gymTrainers.gymId, gymId), eq(gymTrainers.gymTrainerId, id))),
    // Global participant conflict check is internal only. Never expose foreign Gym rows.
    overlap: async (ids: string[], start: Date, end: Date, except?: string) => (await tx.select({ id: ptAppointments.appointmentId }).from(ptAppointments)
      .innerJoin(ptRegistrations, eq(ptRegistrations.registrationId, ptAppointments.registrationId))
      .innerJoin(memberships, eq(memberships.membershipId, ptRegistrations.membershipId))
      .innerJoin(gymTrainers, eq(gymTrainers.gymTrainerId, ptRegistrations.gymTrainerId))
      .where(and(or(inArray(memberships.userId, ids), inArray(gymTrainers.userId, ids)),
        inArray(ptAppointments.status, ['PENDING', 'CONFIRMED']), lt(ptAppointments.startTime, end), gt(ptAppointments.endTime, start),
        except ? ne(ptAppointments.appointmentId, except) : undefined)).limit(1)).length > 0,
    list: async (kind: 'registrations' | 'appointments', filter: SQL, query: PtPage) => {
      if (kind === 'registrations') {
        const base = registrations().where(filter);
        const [{ total }] = await tx.select({ total: count() }).from(base.as('scoped_list'));
        const data = await base.orderBy(desc(ptRegistrations.createdAt), asc(ptRegistrations.registrationId)).limit(query.pageSize).offset((query.page - 1) * query.pageSize);
        return { kind: 'registrations' as const, data, total };
      }
      const base = appointments().where(filter);
      const [{ total }] = await tx.select({ total: count() }).from(base.as('scoped_list'));
      const data = await base.orderBy(desc(ptAppointments.startTime), asc(ptAppointments.appointmentId)).limit(query.pageSize).offset((query.page - 1) * query.pageSize);
      return { kind: 'appointments' as const, data, total };
    },
  };
};
export type PtRegistrationRow = NonNullable<Awaited<ReturnType<ReturnType<typeof createPtWorkflowRepository>['registration']>>>;
export type PtAppointmentRow = NonNullable<Awaited<ReturnType<ReturnType<typeof createPtWorkflowRepository>['appointment']>>>;
