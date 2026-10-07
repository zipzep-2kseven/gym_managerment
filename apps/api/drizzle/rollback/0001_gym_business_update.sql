-- Manual rollback only. Refuse to discard any new business data or changed availability.
-- Run in the same transaction as journal removal; see docs/database-business-update.md.
LOCK TABLE gym_images, consultation_requests, pt_social_links, pt_working_schedules,
  gym_reviews, trainer_reviews, gym_trainers, memberships, pt_registrations IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM gym_images) OR EXISTS (SELECT 1 FROM consultation_requests)
    OR EXISTS (SELECT 1 FROM pt_social_links) OR EXISTS (SELECT 1 FROM pt_working_schedules)
    OR EXISTS (SELECT 1 FROM gym_reviews) OR EXISTS (SELECT 1 FROM trainer_reviews)
    OR EXISTS (SELECT 1 FROM gym_trainers WHERE availability <> 'NOT_ACCEPTING') THEN
    RAISE EXCEPTION 'Rollback refused: new business data exists. Retain schema and roll back application instead.';
  END IF;
END $$;
DROP TRIGGER pt_registration_gym_guard ON pt_registrations;
DROP TRIGGER membership_pt_gym_guard ON memberships;
DROP TRIGGER trainer_pt_gym_guard ON gym_trainers;
DROP FUNCTION enforce_pt_registration_gym();
DROP FUNCTION protect_pt_parent_gym();
DROP TABLE gym_reviews, trainer_reviews;
DROP FUNCTION protect_customer_review();
DROP TABLE gym_images, consultation_requests, pt_social_links, pt_working_schedules;
ALTER TABLE gym_trainers DROP CONSTRAINT gym_trainers_availability_check;
ALTER TABLE gym_trainers DROP COLUMN availability;
