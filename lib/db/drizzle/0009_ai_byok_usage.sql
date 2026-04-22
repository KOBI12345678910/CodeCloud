CREATE TABLE "ai_byok_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"encrypted_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"model_id" varchar(64) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"mode" varchar(16) NOT NULL,
	"input_tokens" text NOT NULL,
	"output_tokens" text NOT NULL,
	"cost_usd" text NOT NULL,
	"latency_ms" text NOT NULL,
	"cache_hit" text NOT NULL,
	"byok" text NOT NULL,
	"served_by_fallback" text NOT NULL,
	"task_type" varchar(32) NOT NULL,
	"rubric" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yjs_documents" (
	"doc_name" varchar(512) PRIMARY KEY NOT NULL,
	"state" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD COLUMN "stripe_event_id" varchar(255);--> statement-breakpoint
ALTER TABLE "ai_byok_keys" ADD CONSTRAINT "ai_byok_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_ai_byok_user_provider" ON "ai_byok_keys" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "idx_ai_byok_user" ON "ai_byok_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_user_time" ON "ai_usage_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_model" ON "ai_usage_events" USING btree ("model_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_yjs_documents_updated" ON "yjs_documents" USING btree ("updated_at");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_stripe_event_id_unique" UNIQUE("stripe_event_id");