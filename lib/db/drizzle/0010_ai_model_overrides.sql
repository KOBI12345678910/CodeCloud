CREATE TABLE "ai_model_overrides" (
	"model_id" varchar(64) PRIMARY KEY NOT NULL,
	"enabled" boolean,
	"input_per_1k" real,
	"output_per_1k" real,
	"quality_score" integer,
	"fallback_chain" jsonb,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_registry_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" varchar(64) NOT NULL,
	"actor_id" uuid,
	"patch" jsonb NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"version" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_model_overrides" ADD CONSTRAINT "ai_model_overrides_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_registry_audit" ADD CONSTRAINT "ai_registry_audit_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;