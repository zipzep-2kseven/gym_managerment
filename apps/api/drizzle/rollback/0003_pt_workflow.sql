-- Explicit integrity rollback only. Preserves all domain rows and history.
-- Roll back before 0002; remove its journal entry only in a controlled procedure.
DROP TRIGGER pt_trainer_identity_guard ON gym_trainers;
DROP FUNCTION guard_pt_trainer_identity();
DROP TRIGGER pt_membership_identity_guard ON memberships;
DROP FUNCTION guard_pt_participant_identity();
DROP TRIGGER pt_appointment_overlap_guard ON pt_appointments;
DROP FUNCTION guard_pt_overlap();
DROP TRIGGER pt_appointment_history_guard ON pt_appointments;
DROP TRIGGER pt_registration_history_guard ON pt_registrations;
DROP FUNCTION guard_pt_history();
DROP INDEX pt_registrations_active_membership_key;
