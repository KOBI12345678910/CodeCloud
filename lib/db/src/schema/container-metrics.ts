import { pgTable, uuid, varchar, integer, real, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const containerHealthEnum = pgEnum("container_health", ["healthy", "unhealthy", "degraded"]);

export const containerMetricsTable = pgTable("container_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }).unique(),
  containerId: varchar("container_id", { length: 255 }),
  cpuUsage: real("cpu_usage").notNull().default(0),
  memoryUsageMb: real("memory_usage_mb").notNull().default(0),
  memoryLimitMb: real("memory_limit_mb").notNull().default(512),
  diskUsageMb: real("disk_usage_mb").notNull().default(0),
  diskLimitMb: real("disk_limit_mb").notNull().default(1024),
  health: containerHealthEnum("health").notNull().default("healthy"),
  restartCount: integer("restart_count").notNull().default(0),
  lastHealthCheck: timestamp("last_health_check", { withTimezone: true }),
  lastRestartedAt: timestamp("last_restarted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_container_metrics_project").on(table.projectId),
  index("idx_container_metrics_health").on(table.health),
]);

export type ContainerMetric = typeof containerMetricsTable.$inferSelect;
