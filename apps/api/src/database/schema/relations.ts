import { gymImages, consultationRequests } from './discovery.js';
import { ptSocialLinks } from './trainer-profile.js';
import { gymReviews, trainerReviews } from './reviews.js';
import { relations } from 'drizzle-orm';
import { users, userProfiles, roles, userRoles } from './users.js';
import { gyms, gymManagers, gymTrainers } from './gyms.js';
import { packages } from './packages.js';
import { payments } from './payments.js';
import { memberships } from './memberships.js';
import { ptRegistrations, ptAppointments } from './pt.js';
import { gymReports } from './reports.js';

// users relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.userId],
    references: [userProfiles.userId],
  }),
  userRoles: many(userRoles),
  gymManagers: many(gymManagers),
  gymTrainers: many(gymTrainers),
  payments: many(payments),
  memberships: many(memberships),
  consultations: many(consultationRequests, { relationName: 'consultationUser' }),
  assignedConsultations: many(consultationRequests, { relationName: 'consultationAssignee' }),
  gymReviews: many(gymReviews, { relationName: 'gymReviewAuthor' }),
  hiddenGymReviews: many(gymReviews, { relationName: 'gymReviewModerator' }),
  trainerReviews: many(trainerReviews, { relationName: 'trainerReviewAuthor' }),
  hiddenTrainerReviews: many(trainerReviews, { relationName: 'trainerReviewModerator' }),
  reportsSubmitted: many(gymReports, { relationName: 'reportSubmitter' }),
  reportsResolved: many(gymReports, { relationName: 'reportResolver' }),
}));

// user_profiles relations
export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.userId],
  }),
}));

// roles relations
export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

// user_roles relations
export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.userId],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.roleId],
  }),
}));

// gyms relations
export const gymsRelations = relations(gyms, ({ many }) => ({
  images: many(gymImages),
  consultations: many(consultationRequests),
  reviews: many(gymReviews),
  managers: many(gymManagers),
  trainers: many(gymTrainers),
  packages: many(packages),
  payments: many(payments),
  memberships: many(memberships),
  reports: many(gymReports),
}));

// gym_managers relations
export const gymManagersRelations = relations(gymManagers, ({ one }) => ({
  gym: one(gyms, {
    fields: [gymManagers.gymId],
    references: [gyms.gymId],
  }),
  user: one(users, {
    fields: [gymManagers.userId],
    references: [users.userId],
  }),
}));

// gym_trainers relations
export const gymTrainersRelations = relations(gymTrainers, ({ one, many }) => ({
  gym: one(gyms, {
    fields: [gymTrainers.gymId],
    references: [gyms.gymId],
  }),
  user: one(users, {
    fields: [gymTrainers.userId],
    references: [users.userId],
  }),
  socialLinks: many(ptSocialLinks),
  reviews: many(trainerReviews),
  ptRegistrations: many(ptRegistrations),
}));

// packages relations
export const packagesRelations = relations(packages, ({ one, many }) => ({
  gym: one(gyms, {
    fields: [packages.gymId],
    references: [gyms.gymId],
  }),
  payments: many(payments),
  memberships: many(memberships),
}));

// payments relations
export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.userId],
  }),
  gym: one(gyms, {
    fields: [payments.gymId],
    references: [gyms.gymId],
  }),
  package: one(packages, {
    fields: [payments.packageId],
    references: [packages.packageId],
  }),
  membership: one(memberships, {
    fields: [payments.paymentId],
    references: [memberships.paymentId],
  }),
}));

// memberships relations
export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.userId],
  }),
  gym: one(gyms, {
    fields: [memberships.gymId],
    references: [gyms.gymId],
  }),
  package: one(packages, {
    fields: [memberships.packageId],
    references: [packages.packageId],
  }),
  payment: one(payments, {
    fields: [memberships.paymentId],
    references: [payments.paymentId],
  }),
  ptRegistrations: many(ptRegistrations),
}));

// pt_registrations relations
export const ptRegistrationsRelations = relations(ptRegistrations, ({ one, many }) => ({
  membership: one(memberships, {
    fields: [ptRegistrations.membershipId],
    references: [memberships.membershipId],
  }),
  trainer: one(gymTrainers, {
    fields: [ptRegistrations.gymTrainerId],
    references: [gymTrainers.gymTrainerId],
  }),
  appointments: many(ptAppointments),
}));

// pt_appointments relations
export const ptAppointmentsRelations = relations(ptAppointments, ({ one }) => ({
  registration: one(ptRegistrations, {
    fields: [ptAppointments.registrationId],
    references: [ptRegistrations.registrationId],
  }),
}));

// gym_reports relations
export const gymReportsRelations = relations(gymReports, ({ one }) => ({
  user: one(users, {
    fields: [gymReports.userId],
    references: [users.userId],
    relationName: 'reportSubmitter',
  }),
  gym: one(gyms, {
    fields: [gymReports.gymId],
    references: [gyms.gymId],
  }),
  resolver: one(users, {
    fields: [gymReports.resolvedBy],
    references: [users.userId],
    relationName: 'reportResolver',
  }),
}));

export const gymImagesRelations = relations(gymImages, ({ one }) => ({
  gym: one(gyms, { fields: [gymImages.gymId], references: [gyms.gymId] }),
}));

export const consultationRequestsRelations = relations(consultationRequests, ({ one }) => ({
  gym: one(gyms, { fields: [consultationRequests.gymId], references: [gyms.gymId] }),
  user: one(users, { fields: [consultationRequests.userId], references: [users.userId], relationName: 'consultationUser' }),
  assignee: one(users, { fields: [consultationRequests.assignedTo], references: [users.userId], relationName: 'consultationAssignee' }),
}));

export const ptSocialLinksRelations = relations(ptSocialLinks, ({ one }) => ({
  trainer: one(gymTrainers, { fields: [ptSocialLinks.gymTrainerId], references: [gymTrainers.gymTrainerId] }),
}));

export const gymReviewsRelations = relations(gymReviews, ({ one }) => ({
  gym: one(gyms, { fields: [gymReviews.gymId], references: [gyms.gymId] }),
  author: one(users, { fields: [gymReviews.userId], references: [users.userId], relationName: 'gymReviewAuthor' }),
  moderator: one(users, { fields: [gymReviews.hiddenBy], references: [users.userId], relationName: 'gymReviewModerator' }),
}));

export const trainerReviewsRelations = relations(trainerReviews, ({ one }) => ({
  trainer: one(gymTrainers, { fields: [trainerReviews.gymTrainerId], references: [gymTrainers.gymTrainerId] }),
  author: one(users, { fields: [trainerReviews.userId], references: [users.userId], relationName: 'trainerReviewAuthor' }),
  moderator: one(users, { fields: [trainerReviews.hiddenBy], references: [users.userId], relationName: 'trainerReviewModerator' }),
}));
