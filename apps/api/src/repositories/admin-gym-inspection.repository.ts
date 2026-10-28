import { sql, type SQL } from 'drizzle-orm';
import type { db } from '../database/index.js';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
// Fixed projections and joins: never expose account secrets or storage paths.
export const inspectionQueries = (gym: string): Record<string, SQL> => ({
  trainers: sql`SELECT t.gym_trainer_id AS id, p.full_name, u.email, t.specialization, t.experience_years,
    t.bio, t.status, t.availability, t.joined_at, t.created_at, t.updated_at FROM gym_trainers t
    JOIN users u ON u.user_id=t.user_id LEFT JOIN user_profiles p ON p.user_id=t.user_id WHERE t.gym_id=${gym}`,
  schedules: sql`SELECT s.schedule_id AS id, p.full_name AS trainer_name, s.day_of_week, s.start_time, s.end_time, s.status
    FROM pt_working_schedules s JOIN gym_trainers t ON t.gym_trainer_id=s.gym_trainer_id
    LEFT JOIN user_profiles p ON p.user_id=t.user_id WHERE t.gym_id=${gym}`,
  social: sql`SELECT s.social_link_id AS id, p.full_name AS trainer_name, s.platform, s.url
    FROM pt_social_links s JOIN gym_trainers t ON t.gym_trainer_id=s.gym_trainer_id
    LEFT JOIN user_profiles p ON p.user_id=t.user_id WHERE t.gym_id=${gym}`,
  packages: sql`SELECT package_id AS id, package_name, duration_days, price, status, description, created_at, updated_at
    FROM packages WHERE gym_id=${gym}`,
  memberships: sql`SELECT m.membership_id AS id, p.full_name, u.email, k.package_name, m.start_date, m.end_date,
    m.purchase_price, m.status, m.created_at, m.updated_at FROM memberships m JOIN users u ON u.user_id=m.user_id
    LEFT JOIN user_profiles p ON p.user_id=m.user_id JOIN packages k ON k.package_id=m.package_id AND k.gym_id=m.gym_id WHERE m.gym_id=${gym}`,
  payments: sql`SELECT x.payment_id AS id, p.full_name, u.email, k.package_name, x.amount, x.payment_method,
    x.transaction_code, x.payment_status AS status, x.paid_at, x.created_at, x.updated_at FROM payments x
    JOIN users u ON u.user_id=x.user_id LEFT JOIN user_profiles p ON p.user_id=x.user_id
    JOIN packages k ON k.package_id=x.package_id AND k.gym_id=x.gym_id WHERE x.gym_id=${gym}`,
  consultations: sql`SELECT c.consultation_request_id AS id, c.full_name, c.phone, c.email, c.preferred_contact,
    c.preferred_date, c.preferred_time, c.content, c.status, p.full_name AS assignee_name, c.processing_note, c.created_at, c.updated_at
    FROM consultation_requests c LEFT JOIN user_profiles p ON p.user_id=c.assigned_to WHERE c.gym_id=${gym}`,
  registrations: sql`SELECT r.registration_id AS id, cp.full_name AS customer_name, tp.full_name AS trainer_name,
    k.package_name, m.start_date, m.end_date, r.status, r.note, r.registered_at, r.created_at, r.updated_at
    FROM pt_registrations r JOIN memberships m ON m.membership_id=r.membership_id
    JOIN gym_trainers t ON t.gym_trainer_id=r.gym_trainer_id AND t.gym_id=m.gym_id
    JOIN packages k ON k.package_id=m.package_id AND k.gym_id=m.gym_id
    LEFT JOIN user_profiles cp ON cp.user_id=m.user_id LEFT JOIN user_profiles tp ON tp.user_id=t.user_id WHERE m.gym_id=${gym}`,
  appointments: sql`SELECT a.appointment_id AS id, cp.full_name AS customer_name, tp.full_name AS trainer_name,
    a.start_time, a.end_time, a.status, a.note, a.created_at, a.updated_at FROM pt_appointments a
    JOIN pt_registrations r ON r.registration_id=a.registration_id JOIN memberships m ON m.membership_id=r.membership_id
    JOIN gym_trainers t ON t.gym_trainer_id=r.gym_trainer_id AND t.gym_id=m.gym_id
    LEFT JOIN user_profiles cp ON cp.user_id=m.user_id LEFT JOIN user_profiles tp ON tp.user_id=t.user_id WHERE m.gym_id=${gym}`,
  equipment: sql`SELECT e.equipment_id AS id, e.equipment_code, t.name AS equipment_type, t.description,
    e.purchase_date, e.condition, e.status, e.created_at, e.updated_at FROM equipments e
    JOIN equipment_types t ON t.equipment_type_id=e.equipment_type_id WHERE e.gym_id=${gym}`,
  images: sql`SELECT image_id AS id, caption, display_order, created_at, updated_at FROM gym_images WHERE gym_id=${gym}`,
  reports: sql`SELECT r.report_id AS id, p.full_name, r.report_type, r.title, r.content, e.equipment_code, r.status,
    (r.image_url IS NOT NULL) AS has_image, rp.full_name AS resolver_name, r.resolution_note, r.resolved_at, r.created_at, r.updated_at
    FROM gym_reports r LEFT JOIN user_profiles p ON p.user_id=r.user_id
    LEFT JOIN user_profiles rp ON rp.user_id=r.resolved_by
    LEFT JOIN equipments e ON e.equipment_id=r.equipment_id AND e.gym_id=r.gym_id WHERE r.gym_id=${gym}`,
  'gym-reviews': sql`SELECT r.gym_review_id AS id, p.full_name, r.rating, r.comment, r.status, r.hidden_at,
    hp.full_name AS moderator_name, r.hidden_reason, r.created_at, r.updated_at FROM gym_reviews r
    LEFT JOIN user_profiles p ON p.user_id=r.user_id LEFT JOIN user_profiles hp ON hp.user_id=r.hidden_by WHERE r.gym_id=${gym}`,
  'trainer-reviews': sql`SELECT r.trainer_review_id AS id, p.full_name, tp.full_name AS trainer_name, r.rating, r.comment,
    r.status, r.hidden_at, hp.full_name AS moderator_name, r.hidden_reason, r.created_at, r.updated_at FROM trainer_reviews r
    JOIN gym_trainers t ON t.gym_trainer_id=r.gym_trainer_id LEFT JOIN user_profiles p ON p.user_id=r.user_id
    LEFT JOIN user_profiles tp ON tp.user_id=t.user_id LEFT JOIN user_profiles hp ON hp.user_id=r.hidden_by WHERE t.gym_id=${gym}`,
});

export const createAdminGymInspectionRepository = (tx: Tx) => ({
  list: async (source: SQL, page: number, pageSize: number, search?: string, status?: string) => {
    // Search only approved projected fields. Parameters are always bound, including LIKE metacharacters.
    const term = `%${(search || '').replace(/[\\%_]/g, '\\$&')}%`;
    const where = sql`WHERE (${search || null}::text IS NULL OR row_to_json(record)::text ILIKE ${term})
      AND (${status || null}::text IS NULL OR to_jsonb(record)->>'status' = ${status || null})`;
    const count = await tx.execute<{ total: number }>(sql`SELECT count(*)::int AS total FROM (${source}) record ${where}`);
    const rows = await tx.execute<Record<string, unknown>>(sql`SELECT record.* FROM (${source}) record ${where}
      ORDER BY to_jsonb(record)->>'created_at' DESC NULLS LAST, record.id ASC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`);
    return { data: rows.rows, total: count.rows[0].total };
  },
});
