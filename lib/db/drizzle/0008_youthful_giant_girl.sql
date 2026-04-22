CREATE TYPE "public"."agent_event_type" AS ENUM('user_message', 'assistant_message', 'assistant_token', 'tool_call', 'tool_result', 'tool_error', 'state_change', 'checkpoint', 'rollback', 'cost_update', 'plan');--> statement-breakpoint
CREATE TYPE "public"."agent_task_mode" AS ENUM('plan', 'build', 'background');--> statement-breakpoint
CREATE TYPE "public"."agent_task_state" AS ENUM('draft', 'planned', 'queued', 'active', 'awaiting_approval', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."agent_task_tier" AS ENUM('standard', 'power', 'max');--> statement-breakpoint
CREATE TYPE "public"."ai_message_role" AS ENUM('system', 'user', 'assistant', 'tool');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_kind" AS ENUM('topup', 'subscription_grant', 'promo_grant', 'admin_grant', 'task_debit', 'task_refund', 'stripe_refund', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'open', 'paid', 'void', 'uncollectible', 'refunded');--> statement-breakpoint
CREATE TABLE "agent_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"label" varchar(200) NOT NULL,
	"file_snapshot" jsonb NOT NULL,
	"file_count" integer DEFAULT 0 NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"type" "agent_event_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"state" "agent_task_state" DEFAULT 'queued' NOT NULL,
	"mode" "agent_task_mode" DEFAULT 'build' NOT NULL,
	"tier" "agent_task_tier" DEFAULT 'standard' NOT NULL,
	"model" varchar(80) NOT NULL,
	"plan" jsonb,
	"result" text,
	"error_message" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"action_count" integer DEFAULT 0 NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"message" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "ai_message_role" NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_topup_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"enabled" bigint DEFAULT 0 NOT NULL,
	"threshold_micro_usd" bigint DEFAULT 2000000 NOT NULL,
	"topup_amount_micro_usd" bigint DEFAULT 20000000 NOT NULL,
	"low_balance_warn_micro_usd" bigint DEFAULT 5000000 NOT NULL,
	"stripe_payment_method_id" varchar(255),
	"last_triggered_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credits_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "ledger_entry_kind" NOT NULL,
	"amount_micro_usd" bigint NOT NULL,
	"task_id" uuid,
	"invoice_id" uuid,
	"stripe_event_id" varchar(255),
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_checkpoint_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"step_index" integer NOT NULL,
	"total_cost_micro_usd" bigint DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"step_index" integer DEFAULT 0 NOT NULL,
	"kind" varchar(40) NOT NULL,
	"model" varchar(80),
	"provider" varchar(60),
	"endpoint" varchar(200),
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cached_input_tokens" integer DEFAULT 0 NOT NULL,
	"compute_ms" integer DEFAULT 0 NOT NULL,
	"peak_memory_mb" real DEFAULT 0 NOT NULL,
	"storage_delta_mb" real DEFAULT 0 NOT NULL,
	"cost_micro_usd" bigint DEFAULT 0 NOT NULL,
	"pricing_version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"action" varchar(80) NOT NULL,
	"target_user_id" uuid,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" varchar(255) NOT NULL,
	"type" varchar(80) NOT NULL,
	"processed_at" timestamp with time zone,
	"payload" jsonb NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "billing_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"number" varchar(60) NOT NULL,
	"stripe_invoice_id" varchar(255),
	"status" "invoice_status" DEFAULT 'open' NOT NULL,
	"amount_micro_usd" bigint NOT NULL,
	"tax_micro_usd" bigint DEFAULT 0 NOT NULL,
	"total_micro_usd" bigint NOT NULL,
	"currency" varchar(8) DEFAULT 'usd' NOT NULL,
	"description" text,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pdf_hash" varchar(80),
	"pdf_storage_key" varchar(255),
	"hosted_url" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "pricing_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" bigint NOT NULL,
	"prices" jsonb NOT NULL,
	"margin_bps" bigint DEFAULT 2000 NOT NULL,
	"notes" text,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_versions_version_unique" UNIQUE("version")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "is_template" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "test_command" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "test_log" text;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "test_status" varchar(20);--> statement-breakpoint
ALTER TABLE "agent_checkpoints" ADD CONSTRAINT "agent_checkpoints_task_id_agent_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agent_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_checkpoints" ADD CONSTRAINT "agent_checkpoints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_task_id_agent_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agent_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_topup_settings" ADD CONSTRAINT "auto_topup_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_ledger" ADD CONSTRAINT "credits_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_checkpoint_usage" ADD CONSTRAINT "task_checkpoint_usage_task_id_agent_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agent_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_usage" ADD CONSTRAINT "task_usage_task_id_agent_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agent_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_usage" ADD CONSTRAINT "task_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit" ADD CONSTRAINT "admin_audit_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit" ADD CONSTRAINT "admin_audit_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_checkpoints_task" ON "agent_checkpoints" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_agent_checkpoints_project" ON "agent_checkpoints" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_agent_events_task" ON "agent_events" USING btree ("task_id","seq");--> statement-breakpoint
CREATE INDEX "idx_agent_tasks_project" ON "agent_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_agent_tasks_user" ON "agent_tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_tasks_conv" ON "agent_tasks" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_agent_tasks_state" ON "agent_tasks" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_checkpoints_project" ON "checkpoints" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_checkpoints_created" ON "checkpoints" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_messages_conversation" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_ai_messages_created" ON "ai_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_credits_ledger_user" ON "credits_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_credits_ledger_user_created" ON "credits_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_credits_ledger_task" ON "credits_ledger" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_credits_ledger_stripe_event" ON "credits_ledger" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "idx_task_cp_usage_task" ON "task_checkpoint_usage" USING btree ("task_id","step_index");--> statement-breakpoint
CREATE INDEX "idx_task_usage_task" ON "task_usage" USING btree ("task_id","step_index");--> statement-breakpoint
CREATE INDEX "idx_task_usage_user_created" ON "task_usage" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_task_usage_kind" ON "task_usage" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_admin" ON "admin_audit" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "idx_billing_events_type" ON "billing_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_billing_events_processed" ON "billing_events" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "idx_billing_invoices_user" ON "billing_invoices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_billing_invoices_status" ON "billing_invoices" USING btree ("status");