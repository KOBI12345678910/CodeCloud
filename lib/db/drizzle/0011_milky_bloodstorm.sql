CREATE TYPE "public"."data_region" AS ENUM('us', 'eu', 'apac');--> statement-breakpoint
CREATE TYPE "public"."dsar_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."dsar_type" AS ENUM('export', 'deletion');--> statement-breakpoint
CREATE TYPE "public"."consent_category" AS ENUM('necessary', 'analytics', 'marketing');--> statement-breakpoint
CREATE TABLE "two_factor_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"secret" text NOT NULL,
	"method" varchar(20) DEFAULT 'totp' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"backup_codes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "two_factor_secrets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "sso_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"entity_id" text NOT NULL,
	"login_url" text NOT NULL,
	"certificate" text NOT NULL,
	"metadata_xml" text,
	"acs_url" text,
	"sp_entity_id" text,
	"attribute_mapping" jsonb DEFAULT '{}'::jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"enforced" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_family" varchar(64),
	"device_info" text,
	"ip_address" varchar(45),
	"location" varchar(200),
	"user_agent" text,
	"active" boolean DEFAULT true NOT NULL,
	"last_activity" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"require_2fa" boolean DEFAULT false NOT NULL,
	"default_member_role" varchar(20) DEFAULT 'member' NOT NULL,
	"project_visibility" varchar(20) DEFAULT 'private' NOT NULL,
	"api_access_enabled" boolean DEFAULT true NOT NULL,
	"ip_allowlist_enabled" boolean DEFAULT false NOT NULL,
	"session_timeout_minutes" varchar(10) DEFAULT '480' NOT NULL,
	"allowed_auth_methods" jsonb DEFAULT '["local","google","github"]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_policies_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "login_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(30) NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"method" varchar(30) DEFAULT 'password' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"city" varchar(100),
	"country" varchar(100),
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ip_allowlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"type" varchar(10) DEFAULT 'allow' NOT NULL,
	"cidr" varchar(50) NOT NULL,
	"label" varchar(100),
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dsar_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "dsar_type" NOT NULL,
	"status" "dsar_status" DEFAULT 'pending' NOT NULL,
	"reason" text,
	"download_url" text,
	"scheduled_purge_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" varchar(255),
	"category" "consent_category" NOT NULL,
	"granted" boolean NOT NULL,
	"version" varchar(20) DEFAULT '1.0' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_retention_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"auto_archive_days" integer,
	"auto_delete_days" integer,
	"notify_before_days" integer DEFAULT 7 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_retention_policies_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "data_region" "data_region" DEFAULT 'us' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "sso_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "scope_details" jsonb DEFAULT '{"accessLevel":"read","resources":["*"]}'::jsonb;--> statement-breakpoint
ALTER TABLE "two_factor_secrets" ADD CONSTRAINT "two_factor_secrets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_configurations" ADD CONSTRAINT "sso_configurations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_policies" ADD CONSTRAINT "org_policies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_allowlist" ADD CONSTRAINT "ip_allowlist_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_allowlist" ADD CONSTRAINT "ip_allowlist_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dsar_requests" ADD CONSTRAINT "dsar_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_retention_policies" ADD CONSTRAINT "data_retention_policies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_two_factor_user" ON "two_factor_secrets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sso_config_org" ON "sso_configurations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_user" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_active" ON "user_sessions" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_org_policies_org" ON "org_policies" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_login_history_user" ON "login_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_login_history_created" ON "login_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ip_allowlist_org" ON "ip_allowlist" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_dsar_user" ON "dsar_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_dsar_status" ON "dsar_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dsar_type" ON "dsar_requests" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_consent_user" ON "user_consents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_consent_category" ON "user_consents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_consent_session" ON "user_consents" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_retention_org" ON "data_retention_policies" USING btree ("org_id");