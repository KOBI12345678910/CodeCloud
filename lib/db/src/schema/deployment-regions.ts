import { pgTable, uuid, varchar, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { deploymentsTable } from "./deployments";

export const regionCodeEnum = pgEnum("deployment_region_code", ["us-east", "eu-west", "ap-southeast"]);
export const regionHealthEnum = pgEnum("deployment_region_health", ["healthy", "degraded", "down"]);
export const regionStatusEnum = pgEnum("deployment_region_status", ["pending", "deploying", "live", "failed", "stopped"]);

export const deploymentRegionsTable = pgTable("deployment_regions", {
  id: uuid("id").defaultRandom().primaryKey(),
  deploymentId: uuid("deployment_id").notNull().references(() => deploymentsTable.id, { onDelete: "cascade" }),
  region: regionCodeEnum("region").notNull(),
  status: regionStatusEnum("status").notNull().default("pending"),
  health: regionHealthEnum("health").notNull().default("healthy"),
  latencyMs: integer("latency_ms").notNull().default(0),
  endpoint: varchar("endpoint", { length: 255 }),
  lastHealthCheckAt: timestamp("last_health_check_at", { withTimezone: true }),
  lastHealthyAt: timestamp("last_healthy_at", { withTimezone: true }),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("idx_deployment_regions_deployment").on(table.deploymentId),
  index("idx_deployment_regions_region").on(table.region),
]);

export const insertDeploymentRegionSchema = createInsertSchema(deploymentRegionsTable).omit({ id: true, createdAt: true });
export type InsertDeploymentRegion = z.infer<typeof insertDeploymentRegionSchema>;
export type DeploymentRegion = typeof deploymentRegionsTable.$inferSelect;
