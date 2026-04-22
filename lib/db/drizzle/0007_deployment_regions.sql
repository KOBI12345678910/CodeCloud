CREATE TYPE "public"."deployment_region_code" AS ENUM('us-east', 'eu-west', 'ap-southeast');--> statement-breakpoint
CREATE TYPE "public"."deployment_region_health" AS ENUM('healthy', 'degraded', 'down');--> statement-breakpoint
CREATE TYPE "public"."deployment_region_status" AS ENUM('pending', 'deploying', 'live', 'failed', 'stopped');--> statement-breakpoint
CREATE TABLE "deployment_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployment_id" uuid NOT NULL,
	"region" "deployment_region_code" NOT NULL,
	"status" "deployment_region_status" DEFAULT 'pending' NOT NULL,
	"health" "deployment_region_health" DEFAULT 'healthy' NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"endpoint" varchar(255),
	"last_health_check_at" timestamp with time zone,
	"last_healthy_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "deployment_regions" ADD CONSTRAINT "deployment_regions_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_deployment_regions_deployment" ON "deployment_regions" USING btree ("deployment_id");--> statement-breakpoint
CREATE INDEX "idx_deployment_regions_region" ON "deployment_regions" USING btree ("region");