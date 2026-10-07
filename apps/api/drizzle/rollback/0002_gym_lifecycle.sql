-- Explicit policy rollback only. Preserves every business row and assignment.
DROP TRIGGER appointment_lifecycle_guard ON pt_appointments;
DROP TRIGGER registration_lifecycle_guard ON pt_registrations;
DROP TRIGGER membership_lifecycle_guard ON memberships;
DROP TRIGGER payment_lifecycle_guard ON payments;
DROP TRIGGER manager_lifecycle_guard ON gym_managers;
DROP TRIGGER trainer_lifecycle_guard ON gym_trainers;
DROP TRIGGER gym_shutdown_guard ON gyms;
DROP FUNCTION guard_pt_obligation();
DROP FUNCTION guard_gym_obligation();
DROP FUNCTION guard_assignment_lifecycle();
DROP FUNCTION guard_gym_shutdown();
DROP FUNCTION require_active_gym(uuid);
DROP FUNCTION gym_open_obligations(uuid, uuid);
DROP INDEX gym_trainers_active_user_key;
