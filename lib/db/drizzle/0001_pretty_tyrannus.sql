CREATE TYPE "public"."integration_provider" AS ENUM('slack', 'discord', 'jira', 'linear', 'notion', 'figma');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('pending', 'connected', 'error', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."gpu_status" AS ENUM('available', 'allocated', 'releasing', 'error');--> statement-breakpoint
ALTER TYPE "public"."auth_provider" ADD VALUE 'github';--> statement-breakpoint
CREATE TABLE "project_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"installed_by" uuid NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"status" "integration_status" DEFAULT 'pending' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"webhook_url" varchar(500),
	"webhook_secret" varchar(255),
	"access_token" text,
	"refresh_token" text,
	"external_account_id" varchar(255),
	"external_account_name" varchar(255),
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gpu_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"gpu_model" varchar(100) NOT NULL,
	"gpu_status" "gpu_status" DEFAULT 'available' NOT NULL,
	"utilization_percent" real DEFAULT 0 NOT NULL,
	"memory_used_mb" integer DEFAULT 0 NOT NULL,
	"memory_total_mb" integer DEFAULT 0 NOT NULL,
	"temperature_celsius" real DEFAULT 0 NOT NULL,
	"power_watts" real DEFAULT 0 NOT NULL,
	"allocated_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_id" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "gpu_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "gpu_supported" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "cuda_version" varchar(20);--> statement-breakpoint
ALTER TABLE "project_integrations" ADD CONSTRAINT "project_integrations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_integrations" ADD CONSTRAINT "project_integrations_installed_by_users_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gpu_usage" ADD CONSTRAINT "gpu_usage_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gpu_usage" ADD CONSTRAINT "gpu_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_project_provider" ON "project_integrations" USING btree ("project_id","provider");--> statement-breakpoint
CREATE INDEX "idx_integrations_project" ON "project_integrations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_integrations_provider" ON "project_integrations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "idx_gpu_usage_project" ON "gpu_usage" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_gpu_usage_user" ON "gpu_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gpu_usage_status" ON "gpu_usage" USING btree ("gpu_status");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_github_id_unique" UNIQUE("github_id");