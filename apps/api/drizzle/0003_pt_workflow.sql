CREATE UNIQUE INDEX "pt_registrations_active_membership_key" ON "pt_registrations" USING btree ("membership_id") WHERE status = 'ACTIVE';--> statement-breakpoint
-- Inventory legacy overlaps before installing the guard. Abort without data edits.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pt_appointments a JOIN pt_registrations r ON r.registration_id=a.registration_id
    JOIN memberships m USING(membership_id) JOIN gym_trainers t USING(gym_trainer_id)
    JOIN pt_appointments b ON b.appointment_id>a.appointment_id AND b.status IN ('PENDING','CONFIRMED')
      AND b.start_time<a.end_time AND b.end_time>a.start_time
    JOIN pt_registrations s ON s.registration_id=b.registration_id
    JOIN memberships n ON n.membership_id=s.membership_id JOIN gym_trainers u ON u.gym_trainer_id=s.gym_trainer_id
    WHERE a.status IN ('PENDING','CONFIRMED') AND (m.user_id IN (n.user_id,u.user_id) OR t.user_id IN (n.user_id,u.user_id))) THEN
    RAISE EXCEPTION 'Migration refused: legacy participant schedule conflict';
  END IF;
END $$;
--> statement-breakpoint
-- Fail on conflicting legacy data: never rewrite registrations to make this migrate.
CREATE FUNCTION guard_pt_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'pt_registrations' THEN
    IF OLD.membership_id <> NEW.membership_id OR OLD.gym_trainer_id <> NEW.gym_trainer_id THEN
      RAISE EXCEPTION 'Registration identity is immutable' USING ERRCODE='23514', CONSTRAINT='pt_registration_identity';
    END IF;
    IF OLD.status <> 'ACTIVE' AND NEW IS DISTINCT FROM OLD THEN
      RAISE EXCEPTION 'Registration history is immutable' USING ERRCODE='23514', CONSTRAINT='pt_registration_history';
    END IF;
    IF NEW.status <> 'ACTIVE' AND EXISTS (SELECT 1 FROM pt_appointments WHERE registration_id=OLD.registration_id AND status IN ('PENDING','CONFIRMED')) THEN
      RAISE EXCEPTION 'Registration has open appointments' USING ERRCODE='23514', CONSTRAINT='pt_registration_open_appointments';
    END IF;
  ELSE
    IF OLD.registration_id <> NEW.registration_id OR (OLD.status IN ('COMPLETED','CANCELLED') AND NEW IS DISTINCT FROM OLD) THEN
      RAISE EXCEPTION 'Appointment history is immutable' USING ERRCODE='23514', CONSTRAINT='pt_appointment_history';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER pt_registration_history_guard BEFORE UPDATE ON pt_registrations FOR EACH ROW EXECUTE FUNCTION guard_pt_history();
--> statement-breakpoint
CREATE TRIGGER pt_appointment_history_guard BEFORE UPDATE ON pt_appointments FOR EACH ROW EXECUTE FUNCTION guard_pt_history();
--> statement-breakpoint
CREATE FUNCTION guard_pt_overlap() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE customer_id uuid; trainer_id uuid; target_gym uuid;
BEGIN
  -- A repeatable-read snapshot can miss a conflict committed while waiting for
  -- account locks. Runtime writes use READ COMMITTED; reject stale snapshots.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'PT writes require read committed isolation' USING ERRCODE='23514', CONSTRAINT='pt_appointment_isolation';
  END IF;
  SELECT m.user_id,t.user_id,m.gym_id INTO customer_id,trainer_id,target_gym
  FROM pt_registrations r JOIN memberships m USING(membership_id) JOIN gym_trainers t USING(gym_trainer_id)
  WHERE r.registration_id=NEW.registration_id;
  -- Matches API Gym → sorted participant accounts. Outside-API row locks may
  -- produce a deadlock; PostgreSQL aborts that transaction rather than bypassing.
  PERFORM 1 FROM gyms WHERE gym_id=target_gym FOR NO KEY UPDATE;
  PERFORM 1 FROM users WHERE user_id IN (customer_id,trainer_id) ORDER BY user_id FOR UPDATE;
  IF NEW.status IN ('PENDING','CONFIRMED') AND EXISTS (
    SELECT 1 FROM pt_appointments a JOIN pt_registrations r USING(registration_id)
    JOIN memberships m USING(membership_id) JOIN gym_trainers t USING(gym_trainer_id)
    WHERE a.appointment_id <> NEW.appointment_id AND a.status IN ('PENDING','CONFIRMED')
    AND (m.user_id IN (customer_id,trainer_id) OR t.user_id IN (customer_id,trainer_id))
    AND a.start_time < NEW.end_time AND a.end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'Participant schedule conflict' USING ERRCODE='23514', CONSTRAINT='pt_appointment_overlap';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER pt_appointment_overlap_guard BEFORE INSERT OR UPDATE ON pt_appointments FOR EACH ROW EXECUTE FUNCTION guard_pt_overlap();

--> statement-breakpoint
CREATE FUNCTION guard_pt_participant_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id THEN
    IF (TG_TABLE_NAME='memberships' AND EXISTS (SELECT 1 FROM pt_registrations WHERE membership_id=OLD.membership_id)) THEN
      RAISE EXCEPTION 'Membership participant is immutable' USING ERRCODE='23514', CONSTRAINT='pt_membership_identity';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER pt_membership_identity_guard BEFORE UPDATE OF user_id ON memberships FOR EACH ROW EXECUTE FUNCTION guard_pt_participant_identity();
--> statement-breakpoint
CREATE FUNCTION guard_pt_trainer_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id AND EXISTS (SELECT 1 FROM pt_registrations WHERE gym_trainer_id=OLD.gym_trainer_id) THEN
    RAISE EXCEPTION 'Trainer participant is immutable' USING ERRCODE='23514', CONSTRAINT='pt_trainer_identity';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER pt_trainer_identity_guard BEFORE UPDATE OF user_id ON gym_trainers FOR EACH ROW EXECUTE FUNCTION guard_pt_trainer_identity();
