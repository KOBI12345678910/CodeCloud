CREATE TYPE "public"."resource_tier" AS ENUM('free', 'small', 'medium', 'large', 'xlarge');--> statement-breakpoint
CREATE TYPE "public"."template_difficulty" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."collaborator_status" AS ENUM('pending', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."deployment_environment" AS ENUM('production', 'staging', 'preview', 'development');--> statement-breakpoint
CREATE TYPE "public"."file_change_type" AS ENUM('create', 'update', 'delete', 'rename');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'in_review', 'approved', 'changes_requested', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."live_session_status" AS ENUM('active', 'paused', 'ended');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."webhook_event" AS ENUM('push', 'deploy', 'star', 'fork', 'project.create', 'project.update', 'project.delete', 'collaborator.add', 'collaborator.remove');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."cert_status" AS ENUM('pending', 'issuing', 'active', 'expiring', 'expired', 'failed', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."snapshot_status" AS ENUM('creating', 'ready', 'restoring', 'failed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."snapshot_trigger" AS ENUM('manual', 'auto', 'pre_deploy', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."network_policy" AS ENUM('allow_all', 'deny_all', 'custom');--> statement-breakpoint
CREATE TYPE "public"."container_health" AS ENUM('healthy', 'unhealthy', 'degraded');--> statement-breakpoint
CREATE TYPE "public"."log_stream" AS ENUM('stdout', 'stderr', 'system');--> statement-breakpoint
ALTER TYPE "public"."deployment_status" ADD VALUE 'queued' BEFORE 'building';--> statement-breakpoint
CREATE TABLE "ai_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" varchar(32) NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"branch" varchar(100),
	"commit_hash" varchar(40),
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"file_id" uuid,
	"file_path" varchar(500),
	"line_number" integer,
	"line_end_number" integer,
	"content" text NOT NULL,
	"resolved" varchar(10) DEFAULT 'false' NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"host_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"share_code" varchar(20) NOT NULL,
	"status" "live_session_status" DEFAULT 'active' NOT NULL,
	"max_participants" integer DEFAULT 50 NOT NULL,
	"allow_chat" boolean DEFAULT true NOT NULL,
	"default_role" varchar(20) DEFAULT 'spectator' NOT NULL,
	"active_file" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "live_sessions_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
CREATE TABLE "session_chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'spectator' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oauth_apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"client_id" varchar(64) NOT NULL,
	"client_secret_hash" varchar(255) NOT NULL,
	"client_secret_prefix" varchar(12) NOT NULL,
	"redirect_uris" text DEFAULT '[]' NOT NULL,
	"homepage" varchar(500),
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_apps_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"scopes" text DEFAULT 'read' NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event" varchar(50) NOT NULL,
	"payload" text NOT NULL,
	"url" varchar(500) NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"status_code" integer,
	"response_body" text,
	"error_message" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"url" varchar(500) NOT NULL,
	"secret" varchar(255) NOT NULL,
	"events" text DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"invited_by" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "org_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid,
	"to_email" varchar(255) NOT NULL,
	"status" "transfer_status" DEFAULT 'pending' NOT NULL,
	"token" varchar(128) NOT NULL,
	"message" varchar(500),
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_transfers_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "ssl_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"cert_status" "cert_status" DEFAULT 'pending' NOT NULL,
	"issuer" varchar(100) DEFAULT 'Let''s Encrypt',
	"serial_number" varchar(100),
	"fingerprint" varchar(128),
	"force_https" boolean DEFAULT true NOT NULL,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"last_renewal_at" timestamp with time zone,
	"last_renewal_error" text,
	"dns_verified" boolean DEFAULT false NOT NULL,
	"verification_token" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"snapshot_status" "snapshot_status" DEFAULT 'creating' NOT NULL,
	"snapshot_trigger" "snapshot_trigger" DEFAULT 'manual' NOT NULL,
	"file_snapshot" jsonb,
	"env_snapshot" jsonb,
	"container_config" jsonb,
	"size_bytes" integer DEFAULT 0,
	"file_count" integer DEFAULT 0,
	"restored_from_id" uuid,
	"is_automatic" boolean DEFAULT false NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "container_networks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"owner_id" varchar(255) NOT NULL,
	"subnet" varchar(50) NOT NULL,
	"policy" "network_policy" DEFAULT 'allow_all' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exposed_ports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"port" integer NOT NULL,
	"protocol" varchar(10) DEFAULT 'tcp' NOT NULL,
	"service_name" varchar(100),
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "network_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"hostname" varchar(100) NOT NULL,
	"internal_ip" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "network_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_id" uuid NOT NULL,
	"source_project_id" uuid,
	"target_project_id" uuid,
	"action" varchar(10) NOT NULL,
	"ports" jsonb,
	"priority" integer DEFAULT 100 NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coverage_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"command" text NOT NULL,
	"total_files" integer DEFAULT 0 NOT NULL,
	"covered_files" integer DEFAULT 0 NOT NULL,
	"total_lines" integer DEFAULT 0 NOT NULL,
	"covered_lines" integer DEFAULT 0 NOT NULL,
	"total_branches" integer DEFAULT 0 NOT NULL,
	"covered_branches" integer DEFAULT 0 NOT NULL,
	"total_functions" integer DEFAULT 0 NOT NULL,
	"covered_functions" integer DEFAULT 0 NOT NULL,
	"overall_percentage" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"file_coverage" jsonb DEFAULT '[]'::jsonb,
	"output" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "db_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"action" varchar(50) NOT NULL,
	"table_name" varchar(255),
	"record_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"backup_url" text,
	"restore_point" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"assigned_to" varchar(255),
	"title" text NOT NULL,
	"description" text,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'todo' NOT NULL,
	"due_date" timestamp,
	"source_file" text,
	"source_line" integer,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exec_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"command" text NOT NULL,
	"output" text,
	"exit_code" integer,
	"duration_ms" integer,
	"cwd" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"version" integer NOT NULL,
	"edited_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"updated_by" varchar(255),
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coding_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"project_id" uuid NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"language" varchar(50),
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"keystrokes" integer DEFAULT 0 NOT NULL,
	"lines_added" integer DEFAULT 0 NOT NULL,
	"lines_deleted" integer DEFAULT 0 NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coding_streaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_active_date" date,
	"total_coding_seconds" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"message" text NOT NULL,
	"status" varchar(30) NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"severity" varchar(20) DEFAULT 'minor' NOT NULL,
	"status" varchar(30) DEFAULT 'investigating' NOT NULL,
	"affected_services" text,
	"created_by" varchar(255) NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "container_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"container_id" varchar(255),
	"cpu_usage" real DEFAULT 0 NOT NULL,
	"memory_usage_mb" real DEFAULT 0 NOT NULL,
	"memory_limit_mb" real DEFAULT 512 NOT NULL,
	"disk_usage_mb" real DEFAULT 0 NOT NULL,
	"disk_limit_mb" real DEFAULT 1024 NOT NULL,
	"health" "container_health" DEFAULT 'healthy' NOT NULL,
	"restart_count" integer DEFAULT 0 NOT NULL,
	"last_health_check" timestamp with time zone,
	"last_restarted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "container_metrics_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "architecture_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"tech_stack" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"file_tree" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"schema" jsonb DEFAULT '{"tables":[],"relationships":[]}'::jsonb NOT NULL,
	"endpoints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scaffolded" jsonb DEFAULT '{"done":false,"fileCount":0}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"github_delivery_id" varchar(255),
	"event" varchar(100) NOT NULL,
	"action" varchar(100),
	"repository_id" varchar(255),
	"repository_name" varchar(255),
	"sender_login" varchar(100),
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_webhooks_github_delivery_id_unique" UNIQUE("github_delivery_id")
);
--> statement-breakpoint
CREATE TABLE "container_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"container_id" varchar(255),
	"stream" "log_stream" DEFAULT 'stdout' NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "unique_project_secret_key";--> statement-breakpoint
ALTER TABLE "deployments" ALTER COLUMN "status" SET DEFAULT 'queued';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_username" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_token" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_password_token" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_password_expires" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferences" jsonb DEFAULT '{"theme":"dark","fontSize":14,"tabSize":2,"wordWrap":true,"minimap":true,"fontFamily":"monospace","autoSave":true,"autoSaveDelay":1000,"terminalFontSize":14,"locale":"en"}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "project_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "readme_content" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "framework" varchar(50);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "cloned_from_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "clone_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "fork_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "star_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "build_command" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "install_command" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "output_dir" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "port" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "container_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "container_last_active" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "resource_tier" "resource_tier" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_repo_url" varchar(500);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_repo_id" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_branch" varchar(255) DEFAULT 'main';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "github_last_sync_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "auto_commit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "long_description" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "framework" varchar(50);--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "category" varchar(50);--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "banner_url" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "build_command" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "install_command" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "port" integer;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "env_template" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "difficulty" "template_difficulty" DEFAULT 'beginner' NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "estimated_setup_min" integer;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "use_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collaborators" ADD COLUMN "status" "collaborator_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "collaborators" ADD COLUMN "invite_email" varchar(255);--> statement-breakpoint
ALTER TABLE "collaborators" ADD COLUMN "last_accessed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "environment" "deployment_environment" DEFAULT 'production' NOT NULL;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "custom_domain" varchar(255);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "url" varchar(500);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "cloud_run_service" varchar(255);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "cloud_run_revision" varchar(255);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "image_url" varchar(500);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "build_duration_ms" integer;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "min_instances" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "max_instances" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "memory_mb" integer DEFAULT 512 NOT NULL;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "cpu" varchar(20) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "file_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "commit_sha" varchar(64);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "commit_message" varchar(500);--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "rollback_from_id" uuid;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_secrets" ADD COLUMN "environment" varchar(20) DEFAULT 'development' NOT NULL;--> statement-breakpoint
ALTER TABLE "file_versions" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "file_versions" ADD COLUMN "diff_from_previous" text;--> statement-breakpoint
ALTER TABLE "file_versions" ADD COLUMN "change_type" "file_change_type" DEFAULT 'update' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_reviews" ADD CONSTRAINT "code_reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_reviews" ADD CONSTRAINT "code_reviews_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_reviews" ADD CONSTRAINT "code_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_review_id_code_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."code_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_chat" ADD CONSTRAINT "session_chat_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_chat" ADD CONSTRAINT "session_chat_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_apps" ADD CONSTRAINT "oauth_apps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_app_id_oauth_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."oauth_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_secrets" ADD CONSTRAINT "org_secrets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_secrets" ADD CONSTRAINT "org_secrets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_transfers" ADD CONSTRAINT "project_transfers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_transfers" ADD CONSTRAINT "project_transfers_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_transfers" ADD CONSTRAINT "project_transfers_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ssl_certificates" ADD CONSTRAINT "ssl_certificates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exposed_ports" ADD CONSTRAINT "exposed_ports_network_id_container_networks_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."container_networks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exposed_ports" ADD CONSTRAINT "exposed_ports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_members" ADD CONSTRAINT "network_members_network_id_container_networks_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."container_networks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_members" ADD CONSTRAINT "network_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_policies" ADD CONSTRAINT "network_policies_network_id_container_networks_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."container_networks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_policies" ADD CONSTRAINT "network_policies_source_project_id_projects_id_fk" FOREIGN KEY ("source_project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_policies" ADD CONSTRAINT "network_policies_target_project_id_projects_id_fk" FOREIGN KEY ("target_project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coverage_reports" ADD CONSTRAINT "coverage_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_sync_logs" ADD CONSTRAINT "db_sync_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exec_history" ADD CONSTRAINT "exec_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_page_versions" ADD CONSTRAINT "wiki_page_versions_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding_stats" ADD CONSTRAINT "coding_stats_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "container_metrics" ADD CONSTRAINT "container_metrics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "architecture_plans" ADD CONSTRAINT "architecture_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "architecture_plans" ADD CONSTRAINT "architecture_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_webhooks" ADD CONSTRAINT "github_webhooks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "container_logs" ADD CONSTRAINT "container_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_requests_user_created" ON "ai_requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_reviews_project" ON "code_reviews" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_requester" ON "code_reviews" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_reviewer" ON "code_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_status" ON "code_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_review_comments_review" ON "review_comments" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "idx_review_comments_file" ON "review_comments" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_live_sessions_project" ON "live_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_live_sessions_host" ON "live_sessions" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "idx_live_sessions_share_code" ON "live_sessions" USING btree ("share_code");--> statement-breakpoint
CREATE INDEX "idx_live_sessions_status" ON "live_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_session_chat_session" ON "session_chat" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_session_participants_session" ON "session_participants" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_session_participants_user" ON "session_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_apps_user" ON "oauth_apps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_apps_client_id" ON "oauth_apps" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_auth_user" ON "oauth_authorizations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_auth_app" ON "oauth_authorizations" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_webhook" ON "webhook_deliveries" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_status" ON "webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_webhooks_user" ON "webhooks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_webhooks_project" ON "webhooks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_org_invites_org" ON "org_invites" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_org_invites_email" ON "org_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_org_invites_token" ON "org_invites" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_secret_key" ON "org_secrets" USING btree ("org_id","key");--> statement-breakpoint
CREATE INDEX "idx_org_secrets_org" ON "org_secrets" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_transfers_project" ON "project_transfers" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_transfers_from" ON "project_transfers" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "idx_transfers_to" ON "project_transfers" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "idx_transfers_token" ON "project_transfers" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_ssl_project" ON "ssl_certificates" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_ssl_domain" ON "ssl_certificates" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_ssl_status" ON "ssl_certificates" USING btree ("cert_status");--> statement-breakpoint
CREATE INDEX "idx_snapshots_project" ON "snapshots" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_snapshots_status" ON "snapshots" USING btree ("snapshot_status");--> statement-breakpoint
CREATE INDEX "idx_snapshots_trigger" ON "snapshots" USING btree ("snapshot_trigger");--> statement-breakpoint
CREATE INDEX "idx_snapshots_created" ON "snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_network_owner" ON "container_networks" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_network_name" ON "container_networks" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_port_network" ON "exposed_ports" USING btree ("network_id");--> statement-breakpoint
CREATE INDEX "idx_port_project" ON "exposed_ports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_member_network" ON "network_members" USING btree ("network_id");--> statement-breakpoint
CREATE INDEX "idx_member_project" ON "network_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_policy_network" ON "network_policies" USING btree ("network_id");--> statement-breakpoint
CREATE INDEX "idx_container_metrics_project" ON "container_metrics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_container_metrics_health" ON "container_metrics" USING btree ("health");--> statement-breakpoint
CREATE INDEX "idx_architecture_plans_user" ON "architecture_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_architecture_plans_project" ON "architecture_plans" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_github_webhooks_project" ON "github_webhooks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_github_webhooks_event" ON "github_webhooks" USING btree ("event");--> statement-breakpoint
CREATE INDEX "idx_github_webhooks_processed" ON "github_webhooks" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "idx_container_logs_project" ON "container_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_container_logs_timestamp" ON "container_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_container_logs_project_timestamp" ON "container_logs" USING btree ("project_id","timestamp");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_username" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_users_github_id" ON "users" USING btree ("github_id");--> statement-breakpoint
CREATE INDEX "idx_users_google_id" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE INDEX "idx_projects_org" ON "projects" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_projects_template" ON "projects" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_projects_public" ON "projects" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "idx_projects_archived" ON "projects" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "idx_projects_language" ON "projects" USING btree ("language");--> statement-breakpoint
CREATE INDEX "idx_projects_github_repo" ON "projects" USING btree ("github_repo_id");--> statement-breakpoint
CREATE INDEX "idx_templates_category" ON "templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_templates_language" ON "templates" USING btree ("language");--> statement-breakpoint
CREATE INDEX "idx_templates_featured" ON "templates" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "idx_templates_active" ON "templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_collaborators_project" ON "collaborators" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_collaborators_user" ON "collaborators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_collaborators_status" ON "collaborators" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_deployments_status" ON "deployments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_deployments_environment" ON "deployments" USING btree ("environment");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_project_secret_key_env" ON "project_secrets" USING btree ("project_id","key","environment");--> statement-breakpoint
CREATE INDEX "idx_project_secrets_env" ON "project_secrets" USING btree ("project_id","environment");--> statement-breakpoint
CREATE INDEX "idx_file_versions_project" ON "file_versions" USING btree ("project_id");