CREATE UNIQUE INDEX "gym_trainers_active_user_key" ON "gym_trainers" USING btree ("user_id") WHERE status = 'ACTIVE';--> statement-breakpoint
-- Q-13: serialize lifecycle changes and new obligations on the parent Gym row.
-- The API acquires this lock BEFORE account/assignment locks. Direct SQL which
-- takes locks in another order may be aborted by PostgreSQL, never bypass checks.
CREATE FUNCTION gym_open_obligations(target_gym uuid, target_trainer uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'payments', CASE WHEN target_trainer IS NULL THEN
      (SELECT count(*) FROM payments WHERE gym_id = target_gym AND payment_status = 'PENDING') ELSE 0 END,
    'memberships', CASE WHEN target_trainer IS NULL THEN
      (SELECT count(*) FROM memberships WHERE gym_id = target_gym AND status IN ('PENDING','ACTIVE')) ELSE 0 END,
    'registrations', (SELECT count(*) FROM pt_registrations r JOIN gym_trainers t USING(gym_trainer_id)
      WHERE t.gym_id = target_gym AND (target_trainer IS NULL OR t.gym_trainer_id = target_trainer) AND r.status = 'ACTIVE'),
    'appointments', (SELECT count(*) FROM pt_appointments a JOIN pt_registrations r USING(registration_id)
      JOIN gym_trainers t USING(gym_trainer_id) WHERE t.gym_id = target_gym
      AND (target_trainer IS NULL OR t.gym_trainer_id = target_trainer) AND a.status IN ('PENDING','CONFIRMED'))
  );
$$;
--> statement-breakpoint
CREATE FUNCTION require_active_gym(target_gym uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE current_status text;
BEGIN
  SELECT status INTO current_status FROM gyms WHERE gym_id = target_gym FOR NO KEY UPDATE;
  IF current_status IS NOT NULL AND current_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Gym is inactive' USING ERRCODE = '23514', CONSTRAINT = 'gym_lifecycle_inactive';
  END IF;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION guard_gym_shutdown() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE blockers jsonb;
BEGIN
  IF OLD.status = 'ACTIVE' AND NEW.status = 'INACTIVE' THEN
    blockers := gym_open_obligations(OLD.gym_id);
    IF EXISTS (SELECT 1 FROM jsonb_each_text(blockers) WHERE value::bigint > 0) THEN
      RAISE EXCEPTION 'Gym has open obligations' USING ERRCODE = '23514',
        CONSTRAINT = 'gym_lifecycle_open_obligations', DETAIL = blockers::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER gym_shutdown_guard BEFORE UPDATE OF status ON gyms
FOR EACH ROW EXECUTE FUNCTION guard_gym_shutdown();
--> statement-breakpoint
CREATE FUNCTION guard_assignment_lifecycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE blockers jsonb;
BEGIN
  -- Lock even on deactivation so new registrations/bookings cannot slip in.
  PERFORM 1 FROM gyms WHERE gym_id = NEW.gym_id FOR NO KEY UPDATE;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'ACTIVE' THEN PERFORM require_active_gym(NEW.gym_id); END IF;
  ELSE
    IF NEW.status = 'ACTIVE' AND (OLD.status <> 'ACTIVE' OR NEW.gym_id <> OLD.gym_id OR NEW.user_id <> OLD.user_id) THEN
      PERFORM require_active_gym(NEW.gym_id);
    END IF;
    IF TG_TABLE_NAME = 'gym_trainers' AND OLD.status = 'ACTIVE' AND NEW.status = 'INACTIVE' THEN
      blockers := gym_open_obligations(OLD.gym_id, OLD.gym_trainer_id);
      IF EXISTS (SELECT 1 FROM jsonb_each_text(blockers) WHERE value::bigint > 0) THEN
        RAISE EXCEPTION 'PT has open obligations' USING ERRCODE = '23514',
          CONSTRAINT = 'trainer_lifecycle_open_obligations', DETAIL = blockers::text;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trainer_lifecycle_guard BEFORE INSERT OR UPDATE OF status, gym_id, user_id ON gym_trainers
FOR EACH ROW EXECUTE FUNCTION guard_assignment_lifecycle();
--> statement-breakpoint
CREATE TRIGGER manager_lifecycle_guard BEFORE INSERT OR UPDATE OF status, gym_id, user_id ON gym_managers
FOR EACH ROW EXECUTE FUNCTION guard_assignment_lifecycle();
--> statement-breakpoint
CREATE FUNCTION guard_gym_obligation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'payments' THEN
    IF NEW.payment_status IN ('PENDING','SUCCESS') THEN PERFORM require_active_gym(NEW.gym_id); END IF;
  ELSE
    IF NEW.status IN ('PENDING','ACTIVE') THEN PERFORM require_active_gym(NEW.gym_id); END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER payment_lifecycle_guard BEFORE INSERT OR UPDATE OF gym_id, payment_status ON payments
FOR EACH ROW EXECUTE FUNCTION guard_gym_obligation();
--> statement-breakpoint
CREATE TRIGGER membership_lifecycle_guard BEFORE INSERT OR UPDATE OF gym_id, status ON memberships
FOR EACH ROW EXECUTE FUNCTION guard_gym_obligation();
--> statement-breakpoint
CREATE FUNCTION guard_pt_obligation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE trainer_id uuid; target_gym uuid; trainer_status text; needs_active boolean;
BEGIN
  IF TG_TABLE_NAME = 'pt_registrations' THEN
    trainer_id := NEW.gym_trainer_id;
    needs_active := NEW.status = 'ACTIVE' OR EXISTS (
      SELECT 1 FROM pt_appointments WHERE registration_id = NEW.registration_id AND status IN ('PENDING','CONFIRMED'));
  ELSE
    SELECT gym_trainer_id INTO trainer_id FROM pt_registrations WHERE registration_id = NEW.registration_id;
    needs_active := NEW.status IN ('PENDING','CONFIRMED');
  END IF;
  IF needs_active THEN
    SELECT gym_id INTO target_gym FROM gym_trainers WHERE gym_trainer_id = trainer_id;
    PERFORM require_active_gym(target_gym);
    SELECT status INTO trainer_status FROM gym_trainers WHERE gym_trainer_id = trainer_id FOR SHARE;
    IF trainer_status IS NOT NULL AND trainer_status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'PT assignment is inactive' USING ERRCODE = '23514', CONSTRAINT = 'trainer_lifecycle_inactive';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER registration_lifecycle_guard BEFORE INSERT OR UPDATE OF gym_trainer_id, membership_id, status ON pt_registrations
FOR EACH ROW EXECUTE FUNCTION guard_pt_obligation();
--> statement-breakpoint
CREATE TRIGGER appointment_lifecycle_guard BEFORE INSERT OR UPDATE OF registration_id, status ON pt_appointments
FOR EACH ROW EXECUTE FUNCTION guard_pt_obligation();
--> statement-breakpoint
-- No automatic reconciliation: fail the migration atomically for invalid legacy data.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM gyms g CROSS JOIN LATERAL jsonb_each_text(gym_open_obligations(g.gym_id)) b
    WHERE g.status = 'INACTIVE' AND b.value::bigint > 0)
    OR EXISTS (SELECT 1 FROM gym_trainers t CROSS JOIN LATERAL jsonb_each_text(gym_open_obligations(t.gym_id,t.gym_trainer_id)) b
      WHERE t.status = 'INACTIVE' AND b.value::bigint > 0) THEN
    RAISE EXCEPTION 'Existing inactive Gym/PT has open obligations; reconcile explicitly before migration';
  END IF;
END;
$$;
