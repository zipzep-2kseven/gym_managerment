ALTER TABLE "gym_reports" DROP CONSTRAINT IF EXISTS "gym_reports_equipment_gym_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "gym_reports_equipment_gym_idx";--> statement-breakpoint
ALTER TABLE "gym_reports" DROP COLUMN IF EXISTS "equipment_id";--> statement-breakpoint
DROP TABLE IF EXISTS "equipments" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "equipment_types" CASCADE;
