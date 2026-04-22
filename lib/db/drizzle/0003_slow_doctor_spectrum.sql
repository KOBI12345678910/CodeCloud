ALTER TABLE "projects" ADD COLUMN "test_command" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "resource_tier" varchar(20) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "test_log" text;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "test_status" varchar(20);