CREATE TYPE "public"."issue_label" AS ENUM('bug', 'feature', 'improvement');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('open', 'in-progress', 'closed');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"status" "issue_status" DEFAULT 'open' NOT NULL,
	"label" "issue_label" DEFAULT 'bug' NOT NULL,
	"assignee_id" uuid,
	"created_by" uuid NOT NULL,
	"code_references" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"todo_id" uuid NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"due_date" timestamp with time zone,
	"status" "milestone_status" DEFAULT 'open' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "issue_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_tasks" ADD CONSTRAINT "milestone_tasks_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_tasks" ADD CONSTRAINT "milestone_tasks_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_issues_project" ON "issues" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_issues_status" ON "issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_issues_label" ON "issues" USING btree ("label");--> statement-breakpoint
CREATE INDEX "idx_issues_assignee" ON "issues" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_issues_created_by" ON "issues" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_milestone_tasks_milestone" ON "milestone_tasks" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "idx_milestone_tasks_todo" ON "milestone_tasks" USING btree ("todo_id");--> statement-breakpoint
CREATE INDEX "idx_milestones_project" ON "milestones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_milestones_status" ON "milestones" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_milestones_due_date" ON "milestones" USING btree ("due_date");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comments_issue" ON "comments" USING btree ("issue_id");