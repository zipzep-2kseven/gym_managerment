CREATE TABLE "roles" (
	"role_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_name" varchar(20) NOT NULL,
	"description" text,
	CONSTRAINT "roles_role_name_key" UNIQUE("role_name"),
	CONSTRAINT "roles_role_name_check" CHECK (role_name IN ('ADMIN', 'MANAGER', 'PT', 'CUSTOMER'))
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"profile_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"date_of_birth" date,
	"gender" text,
	"address" text,
	"avatar_url" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_key" UNIQUE("user_id"),
	CONSTRAINT "user_profiles_full_name_check" CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 100)
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_pkey" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"phone" varchar(20),
	"password_hash" text NOT NULL,
	"email_verified_at" timestamp (3) with time zone,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_phone_key" UNIQUE("phone"),
	CONSTRAINT "users_email_check" CHECK (email = lower(btrim(email)) AND email <> ''),
	CONSTRAINT "users_phone_check" CHECK (phone IS NULL OR btrim(phone) <> ''),
	CONSTRAINT "users_status_check" CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))
);
--> statement-breakpoint
CREATE TABLE "gym_managers" (
	"gym_manager_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gym_managers_gym_user_key" UNIQUE("gym_id","user_id"),
	CONSTRAINT "gym_managers_status_check" CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
--> statement-breakpoint
CREATE TABLE "gym_trainers" (
	"gym_trainer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"specialization" text,
	"experience_years" integer,
	"bio" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gym_trainers_gym_user_key" UNIQUE("gym_id","user_id"),
	CONSTRAINT "gym_trainers_experience_years_check" CHECK (experience_years IS NULL OR experience_years >= 0),
	CONSTRAINT "gym_trainers_status_check" CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
--> statement-breakpoint
CREATE TABLE "gyms" (
	"gym_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_name" text NOT NULL,
	"description" text,
	"phone" varchar(20),
	"email" varchar(254),
	"address" text NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"logo_url" text,
	"opening_time" time(0),
	"closing_time" time(0),
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gyms_latitude_check" CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
	CONSTRAINT "gyms_longitude_check" CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
	CONSTRAINT "gyms_status_check" CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"package_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"package_name" text NOT NULL,
	"description" text,
	"duration_days" integer NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_package_gym_key" UNIQUE("package_id","gym_id"),
	CONSTRAINT "packages_duration_days_check" CHECK (duration_days > 0),
	CONSTRAINT "packages_price_check" CHECK (price >= 0 AND price <> 'NaN'::numeric),
	CONSTRAINT "packages_status_check" CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"payment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gym_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"transaction_code" text,
	"payment_status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_transaction_code_key" UNIQUE("transaction_code"),
	CONSTRAINT "payments_payment_user_gym_package_key" UNIQUE("payment_id","user_id","gym_id","package_id"),
	CONSTRAINT "payments_amount_check" CHECK (amount >= 0 AND amount <> 'NaN'::numeric),
	CONSTRAINT "payments_transaction_code_check" CHECK (transaction_code IS NULL OR btrim(transaction_code) <> ''),
	CONSTRAINT "payments_payment_status_check" CHECK (payment_status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'))
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"membership_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gym_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"payment_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"purchase_price" numeric(14, 2) NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_payment_id_key" UNIQUE("payment_id"),
	CONSTRAINT "memberships_end_date_check" CHECK (end_date >= start_date),
	CONSTRAINT "memberships_purchase_price_check" CHECK (purchase_price >= 0 AND purchase_price <> 'NaN'::numeric),
	CONSTRAINT "memberships_status_check" CHECK (status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "pt_appointments" (
	"appointment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"start_time" timestamp (3) with time zone NOT NULL,
	"end_time" timestamp (3) with time zone NOT NULL,
	"status" varchar(20) NOT NULL,
	"note" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pt_appointments_time_check" CHECK (end_time > start_time),
	CONSTRAINT "pt_appointments_status_check" CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "pt_registrations" (
	"registration_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"gym_trainer_id" uuid NOT NULL,
	"registered_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"status" varchar(20) NOT NULL,
	"note" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pt_registrations_status_check" CHECK (status IN ('ACTIVE', 'CANCELLED', 'COMPLETED'))
);
--> statement-breakpoint
CREATE TABLE "equipment_types" (
	"equipment_type_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipments" (
	"equipment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"equipment_type_id" uuid NOT NULL,
	"equipment_code" text NOT NULL,
	"purchase_date" date,
	"condition" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipments_gym_code_key" UNIQUE("gym_id","equipment_code"),
	CONSTRAINT "equipments_equipment_gym_key" UNIQUE("equipment_id","gym_id"),
	CONSTRAINT "equipments_condition_check" CHECK (condition IN ('GOOD', 'MAINTENANCE', 'BROKEN', 'OUT_OF_SERVICE')),
	CONSTRAINT "equipments_status_check" CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
--> statement-breakpoint
CREATE TABLE "gym_reports" (
	"report_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gym_id" uuid NOT NULL,
	"equipment_id" uuid,
	"report_type" varchar(20) NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp (3) with time zone,
	"resolution_note" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gym_reports_report_type_check" CHECK (report_type IN ('EQUIPMENT', 'FACILITY', 'CLEANLINESS', 'SERVICE', 'OTHER')),
	CONSTRAINT "gym_reports_status_check" CHECK (status IN ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')),
	CONSTRAINT "gym_reports_equipment_required_check" CHECK ((report_type <> 'EQUIPMENT' OR equipment_id IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "gym_managers" ADD CONSTRAINT "gym_managers_gym_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "gym_managers" ADD CONSTRAINT "gym_managers_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "gym_trainers" ADD CONSTRAINT "gym_trainers_gym_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "gym_trainers" ADD CONSTRAINT "gym_trainers_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_gym_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_gym_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_package_gym_fk" FOREIGN KEY ("package_id","gym_id") REFERENCES "public"."packages"("package_id","gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_gym_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_package_gym_fk" FOREIGN KEY ("package_id","gym_id") REFERENCES "public"."packages"("package_id","gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_payment_source_fk" FOREIGN KEY ("payment_id","user_id","gym_id","package_id") REFERENCES "public"."payments"("payment_id","user_id","gym_id","package_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "pt_appointments" ADD CONSTRAINT "pt_appointments_registration_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."pt_registrations"("registration_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "pt_registrations" ADD CONSTRAINT "pt_registrations_membership_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("membership_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "pt_registrations" ADD CONSTRAINT "pt_registrations_gym_trainer_fk" FOREIGN KEY ("gym_trainer_id") REFERENCES "public"."gym_trainers"("gym_trainer_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_gym_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_type_fk" FOREIGN KEY ("equipment_type_id") REFERENCES "public"."equipment_types"("equipment_type_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "gym_reports" ADD CONSTRAINT "gym_reports_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "gym_reports" ADD CONSTRAINT "gym_reports_gym_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "gym_reports" ADD CONSTRAINT "gym_reports_equipment_gym_fk" FOREIGN KEY ("equipment_id","gym_id") REFERENCES "public"."equipments"("equipment_id","gym_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "gym_reports" ADD CONSTRAINT "gym_reports_resolver_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gym_managers_active_gym_key" ON "gym_managers" USING btree ("gym_id") WHERE status = 'ACTIVE';--> statement-breakpoint
CREATE UNIQUE INDEX "gym_managers_active_user_key" ON "gym_managers" USING btree ("user_id") WHERE status = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "gym_managers_user_idx" ON "gym_managers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gym_trainers_user_idx" ON "gym_trainers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "packages_gym_status_created_idx" ON "packages" USING btree ("gym_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "payments_user_created_idx" ON "payments" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "payments_gym_status_created_idx" ON "payments" USING btree ("gym_id","payment_status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "payments_package_gym_idx" ON "payments" USING btree ("package_id","gym_id");--> statement-breakpoint
CREATE INDEX "memberships_user_created_idx" ON "memberships" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "memberships_gym_status_created_idx" ON "memberships" USING btree ("gym_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "memberships_package_gym_idx" ON "memberships" USING btree ("package_id","gym_id");--> statement-breakpoint
CREATE INDEX "pt_appointments_registration_start_idx" ON "pt_appointments" USING btree ("registration_id","start_time");--> statement-breakpoint
CREATE INDEX "pt_appointments_start_idx" ON "pt_appointments" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "pt_registrations_membership_idx" ON "pt_registrations" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "pt_registrations_gym_trainer_idx" ON "pt_registrations" USING btree ("gym_trainer_id");--> statement-breakpoint
CREATE INDEX "equipments_type_idx" ON "equipments" USING btree ("equipment_type_id");--> statement-breakpoint
CREATE INDEX "gym_reports_gym_status_created_idx" ON "gym_reports" USING btree ("gym_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "gym_reports_gym_type_created_idx" ON "gym_reports" USING btree ("gym_id","report_type","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "gym_reports_equipment_gym_idx" ON "gym_reports" USING btree ("equipment_id","gym_id");--> statement-breakpoint
CREATE INDEX "gym_reports_user_created_idx" ON "gym_reports" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "gym_reports_resolver_idx" ON "gym_reports" USING btree ("resolved_by");