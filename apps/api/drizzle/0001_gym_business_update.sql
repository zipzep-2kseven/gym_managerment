CREATE TABLE "consultation_requests" (
	"consultation_request_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"gym_id" uuid NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(254),
	"preferred_date" date,
	"preferred_time" time(0),
	"content" text,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"assigned_to" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consultation_requests_status_check" CHECK (status IN ('PENDING', 'CONTACTED', 'COMPLETED', 'CANCELLED')),
	CONSTRAINT "consultation_requests_contact_check" CHECK (btrim(full_name) <> '' AND btrim(phone) <> '')
);
--> statement-breakpoint
CREATE TABLE "gym_images" (
	"image_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gym_images_order_check" CHECK (display_order >= 0),
	CONSTRAINT "gym_images_url_check" CHECK (btrim(image_url) <> '')
);
--> statement-breakpoint
CREATE TABLE "pt_social_links" (
	"social_link_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_trainer_id" uuid NOT NULL,
	"platform" varchar(20) NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pt_social_links_platform_check" CHECK (platform IN ('FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'WEBSITE')),
	CONSTRAINT "pt_social_links_url_check" CHECK (btrim(url) <> '')
);
--> statement-breakpoint
CREATE TABLE "pt_working_schedules" (
	"schedule_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_trainer_id" uuid NOT NULL,
	"day_of_week" varchar(20) NOT NULL,
	"start_time" time(0) NOT NULL,
	"end_time" time(0) NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pt_working_schedules_day_check" CHECK (day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
	CONSTRAINT "pt_working_schedules_time_check" CHECK (end_time > start_time),
	CONSTRAINT "pt_working_schedules_status_check" CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
--> statement-breakpoint
CREATE TABLE "gym_reviews" (
	"gym_review_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"status" varchar(20) DEFAULT 'VISIBLE' NOT NULL,
	"hidden_at" timestamp (3) with time zone,
	"hidden_by" uuid,
	"hidden_reason" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gym_reviews_rating_check" CHECK (rating BETWEEN 1 AND 5),
	CONSTRAINT "gym_reviews_status_check" CHECK (status IN ('VISIBLE', 'HIDDEN')),
	CONSTRAINT "gym_reviews_moderation_check" CHECK ((status = 'VISIBLE' AND hidden_at IS NULL AND hidden_by IS NULL AND hidden_reason IS NULL) OR (status = 'HIDDEN' AND hidden_at IS NOT NULL AND hidden_by IS NOT NULL AND hidden_reason IS NOT NULL AND btrim(hidden_reason) <> ''))
);
--> statement-breakpoint
CREATE TABLE "trainer_reviews" (
	"trainer_review_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_trainer_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"status" varchar(20) DEFAULT 'VISIBLE' NOT NULL,
	"hidden_at" timestamp (3) with time zone,
	"hidden_by" uuid,
	"hidden_reason" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trainer_reviews_rating_check" CHECK (rating BETWEEN 1 AND 5),
	CONSTRAINT "trainer_reviews_status_check" CHECK (status IN ('VISIBLE', 'HIDDEN')),
	CONSTRAINT "trainer_reviews_moderation_check" CHECK ((status = 'VISIBLE' AND hidden_at IS NULL AND hidden_by IS NULL AND hidden_reason IS NULL) OR (status = 'HIDDEN' AND hidden_at IS NOT NULL AND hidden_by IS NOT NULL AND hidden_reason IS NOT NULL AND btrim(hidden_reason) <> ''))
);
--> statement-breakpoint
ALTER TABLE "gym_trainers" ADD COLUMN "availability" varchar(20) DEFAULT 'NOT_ACCEPTING' NOT NULL;--> statement-breakpoint
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_gym_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_assignee_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "gym_images" ADD CONSTRAINT "gym_images_gym_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "pt_social_links" ADD CONSTRAINT "pt_social_links_trainer_fk" FOREIGN KEY ("gym_trainer_id") REFERENCES "public"."gym_trainers"("gym_trainer_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "pt_working_schedules" ADD CONSTRAINT "pt_working_schedules_trainer_fk" FOREIGN KEY ("gym_trainer_id") REFERENCES "public"."gym_trainers"("gym_trainer_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "gym_reviews" ADD CONSTRAINT "gym_reviews_target_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "gym_reviews" ADD CONSTRAINT "gym_reviews_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "gym_reviews" ADD CONSTRAINT "gym_reviews_moderator_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "trainer_reviews" ADD CONSTRAINT "trainer_reviews_target_fk" FOREIGN KEY ("gym_trainer_id") REFERENCES "public"."gym_trainers"("gym_trainer_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "trainer_reviews" ADD CONSTRAINT "trainer_reviews_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "trainer_reviews" ADD CONSTRAINT "trainer_reviews_moderator_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "consultation_requests_gym_status_idx" ON "consultation_requests" USING btree ("gym_id","status");--> statement-breakpoint
CREATE INDEX "consultation_requests_user_idx" ON "consultation_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consultation_requests_assignee_idx" ON "consultation_requests" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "gym_images_gym_order_idx" ON "gym_images" USING btree ("gym_id","display_order");--> statement-breakpoint
CREATE INDEX "pt_social_links_trainer_idx" ON "pt_social_links" USING btree ("gym_trainer_id");--> statement-breakpoint
CREATE INDEX "pt_working_schedules_trainer_day_idx" ON "pt_working_schedules" USING btree ("gym_trainer_id","day_of_week");--> statement-breakpoint
CREATE INDEX "gym_reviews_target_status_idx" ON "gym_reviews" USING btree ("gym_id","status");--> statement-breakpoint
CREATE INDEX "gym_reviews_user_idx" ON "gym_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gym_reviews_moderator_idx" ON "gym_reviews" USING btree ("hidden_by");--> statement-breakpoint
CREATE INDEX "trainer_reviews_target_status_idx" ON "trainer_reviews" USING btree ("gym_trainer_id","status");--> statement-breakpoint
CREATE INDEX "trainer_reviews_user_idx" ON "trainer_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trainer_reviews_moderator_idx" ON "trainer_reviews" USING btree ("hidden_by");--> statement-breakpoint
ALTER TABLE "gym_trainers" ADD CONSTRAINT "gym_trainers_availability_check" CHECK (availability IN ('ACCEPTING', 'ALMOST_FULL', 'NOT_ACCEPTING'));--> statement-breakpoint
-- Stop atomically if legacy registrations violate the agreed Gym boundary.
LOCK TABLE pt_registrations, memberships, gym_trainers IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pt_registrations r JOIN memberships m USING (membership_id)
    JOIN gym_trainers t USING (gym_trainer_id) WHERE m.gym_id <> t.gym_id) THEN
    RAISE EXCEPTION 'Existing PT registrations cross Gym boundaries; reconcile data before migration';
  END IF;
END $$;
--> statement-breakpoint
CREATE FUNCTION enforce_pt_registration_gym() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE membership_gym uuid; trainer_gym uuid;
BEGIN
  SELECT gym_id INTO membership_gym FROM memberships WHERE membership_id = NEW.membership_id FOR SHARE;
  SELECT gym_id INTO trainer_gym FROM gym_trainers WHERE gym_trainer_id = NEW.gym_trainer_id FOR SHARE;
  IF membership_gym IS DISTINCT FROM trainer_gym THEN
    RAISE EXCEPTION 'PT registration must belong to the membership Gym' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER pt_registration_gym_guard BEFORE INSERT OR UPDATE OF membership_id, gym_trainer_id
ON pt_registrations FOR EACH ROW EXECUTE FUNCTION enforce_pt_registration_gym();
--> statement-breakpoint
CREATE FUNCTION protect_pt_parent_gym() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.gym_id IS DISTINCT FROM OLD.gym_id THEN
    IF TG_TABLE_NAME = 'memberships' THEN
      IF EXISTS (SELECT 1 FROM pt_registrations WHERE membership_id = OLD.membership_id) THEN
        RAISE EXCEPTION 'Cannot move a membership with PT registrations to another Gym' USING ERRCODE = '23514';
      END IF;
    ELSE
      IF EXISTS (SELECT 1 FROM pt_registrations WHERE gym_trainer_id = OLD.gym_trainer_id) THEN
        RAISE EXCEPTION 'Cannot move a trainer with PT registrations to another Gym' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER membership_pt_gym_guard BEFORE UPDATE OF gym_id ON memberships
FOR EACH ROW EXECUTE FUNCTION protect_pt_parent_gym();
--> statement-breakpoint
CREATE TRIGGER trainer_pt_gym_guard BEFORE UPDATE OF gym_id ON gym_trainers
FOR EACH ROW EXECUTE FUNCTION protect_pt_parent_gym();
--> statement-breakpoint
CREATE FUNCTION protect_customer_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'TRUNCATE') THEN
    RAISE EXCEPTION 'Reviews must be retained; use audited hiding' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - ARRAY['status','hidden_at','hidden_by','hidden_reason','updated_at'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','hidden_at','hidden_by','hidden_reason','updated_at'])
      OR OLD.status <> 'VISIBLE' OR NEW.status <> 'HIDDEN' THEN
      RAISE EXCEPTION 'Review content and existing moderation audit are immutable' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.status <> 'VISIBLE' THEN
      RAISE EXCEPTION 'Reviews must start visible' USING ERRCODE = '23514';
    END IF;
    IF TG_TABLE_NAME = 'gym_reviews' THEN
      IF NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = NEW.user_id
        AND m.gym_id = NEW.gym_id AND m.status IN ('ACTIVE','EXPIRED') AND m.start_date <= CURRENT_DATE) THEN
        RAISE EXCEPTION 'Gym review requires a used membership' USING ERRCODE = '23514';
      END IF;
    ELSE
      IF NOT EXISTS (SELECT 1 FROM memberships m JOIN pt_registrations r USING (membership_id)
        JOIN gym_trainers t USING (gym_trainer_id) WHERE m.user_id = NEW.user_id
        AND t.gym_trainer_id = NEW.gym_trainer_id AND m.gym_id = t.gym_id
        AND m.status IN ('ACTIVE','EXPIRED') AND m.start_date <= CURRENT_DATE
        AND r.status IN ('ACTIVE','COMPLETED')) THEN
        RAISE EXCEPTION 'Trainer review requires membership and PT registration' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;
  IF NEW.status = 'HIDDEN' AND NOT EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r USING (role_id) JOIN users u USING (user_id)
    WHERE ur.user_id = NEW.hidden_by AND r.role_name = 'ADMIN' AND u.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Only an active Admin may hide reviews' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER gym_review_guard BEFORE INSERT OR UPDATE OR DELETE ON gym_reviews
FOR EACH ROW EXECUTE FUNCTION protect_customer_review();
--> statement-breakpoint
CREATE TRIGGER trainer_review_guard BEFORE INSERT OR UPDATE OR DELETE ON trainer_reviews
FOR EACH ROW EXECUTE FUNCTION protect_customer_review();
--> statement-breakpoint
CREATE TRIGGER gym_review_truncate_guard BEFORE TRUNCATE ON gym_reviews
FOR EACH STATEMENT EXECUTE FUNCTION protect_customer_review();
--> statement-breakpoint
CREATE TRIGGER trainer_review_truncate_guard BEFORE TRUNCATE ON trainer_reviews
FOR EACH STATEMENT EXECUTE FUNCTION protect_customer_review();
