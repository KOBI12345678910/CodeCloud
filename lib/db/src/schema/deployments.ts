import { pgTable, text, uuid, varchar, integer, timestamp, pgEnum, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const deploymentStatusEnum = pgEnum("deployment_status", ["queued", "building", "deploying", "live", "failed", "stopped"]);
export const deploymentEnvironmentEnum = pgEnum("deployment_environment", ["production", "staging", "preview", "development"]);

export const deploymentsTable = pgTable("deployments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  deployedBy: uuid("deployed_by").notNull().references(() => usersTable.id),
  version: integer("version").notNull(),
  status: deploymentStatusEnum("status").default("queued").notNull(),
  environment: deploymentEnvironmentEnum("environment").default("production").notNull(),
  subdomain: varchar("subdomain", { length: 100 }).unique(),
  customDomain: varchar("custom_domain", { length: 255 }),
  url: varchar("url", { length: 500 }),
  cloudRunService: varchar("cloud_run_service", { length: 255 }),
  cloudRunRevision: varchar("cloud_run_revision", { length: 255 }),
  imageUrl: varchar("image_url", { length: 500 }),
  buildLog: text("build_log"),
  testLog: text("test_log"),
  testStatus: varchar("test_status", { length: 20 }),
  errorLog: text("error_log"),
  buildDurationMs: integer("build_duration_ms"),
  port: integer("port"),
  minInstances: integer("min_instances").default(0).notNull(),
  maxInstances: integer("max_instances").default(1).notNull(),
  memoryMb: integer("memory_mb").default(512).notNull(),
  cpu: varchar("cpu", { length: 20 }).default("1").notNull(),
  fileSnapshot: jsonb("file_snapshot"),
  commitSha: varchar("commit_sha", { length: 64 }),
  commitMessage: varchar("commit_message", { length: 500 }),
  rollbackFromId: uuid("rollback_from_id"),
  duration: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  stoppedAt: timestamp("stopped_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("idx_deployments_project").on(table.projectId),
  index("idx_deployments_status").on(table.status),
  index("idx_deployments_environment").on(table.environment),
]);

export const insertDeploymentSchema = createInsertSchema(deploymentsTable).omit({ id: true, createdAt: true });
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deploymentsTable.$inferSelect;
