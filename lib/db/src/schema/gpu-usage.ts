import { pgTable, uuid, varchar, integer, real, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const gpuStatusEnum = pgEnum("gpu_status", ["available", "allocated", "releasing", "error"]);

export const gpuUsageTable = pgTable("gpu_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  gpuModel: varchar("gpu_model", { length: 100 }).notNull(),
  status: gpuStatusEnum("gpu_status").default("available").notNull(),
  utilizationPercent: real("utilization_percent").default(0).notNull(),
  memoryUsedMb: integer("memory_used_mb").default(0).notNull(),
  memoryTotalMb: integer("memory_total_mb").default(0).notNull(),
  temperatureCelsius: real("temperature_celsius").default(0).notNull(),
  powerWatts: real("power_watts").default(0).notNull(),
  allocatedAt: timestamp("allocated_at", { withTimezone: true }),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_gpu_usage_project").on(table.projectId),
  index("idx_gpu_usage_user").on(table.userId),
  index("idx_gpu_usage_status").on(table.status),
]);

export const insertGpuUsageSchema = createInsertSchema(gpuUsageTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGpuUsage = z.infer<typeof insertGpuUsageSchema>;
export type GpuUsage = typeof gpuUsageTable.$inferSelect;
