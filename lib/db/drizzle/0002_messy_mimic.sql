CREATE TYPE "public"."ssl_status" AS ENUM('pending', 'provisioning', 'active', 'failed');--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"ssl_status" "ssl_status" DEFAULT 'pending' NOT NULL,
	"dns_verified" boolean DEFAULT false NOT NULL,
	"verification_record" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_domains_project" ON "domains" USING btree ("project_id");