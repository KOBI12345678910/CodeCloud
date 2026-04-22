import { pgTable, uuid, varchar, integer, real, timestamp, pgEnum, index, boolean } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const scalingStrategyEnum = pgEnum("scaling_strategy", ["cpu", "memory", "rps", "connections", "custom"]);

export const scalingRulesTable = pgTable("scaling_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  strategy: scalingStrategyEnum("strategy").notNull().default("cpu"),
  minReplicas: integer("min_replicas").notNull().default(1),
  maxReplicas: integer("max_replicas").notNull().default(10),
  cpuThresholdPercent: real("cpu_threshold_percent").notNull().default(70),
  memoryThresholdPercent: real("memory_threshold_percent").notNull().default(80),
  rpsThreshold: integer("rps_threshold").default(1000),
  scaleUpCooldownSec: integer("scale_up_cooldown_sec").notNull().default(60),
  scaleDownCooldownSec: integer("scale_down_cooldown_sec").notNull().default(300),
  currentReplicas: integer("current_replicas").notNull().default(1),
  enabled: boolean("enabled").notNull().default(true),
  lastScaleEventAt: timestamp("last_scale_event_at", { withTimezone: true }),
  lastScaleDirection: varchar("last_scale_direction", { length: 10 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_scaling_rules_project").on(table.projectId),
  index("idx_scaling_rules_enabled").on(table.enabled),
]);

export type ScalingRule = typeof scalingRulesTable.$inferSelect;
export type InsertScalingRule = typeof scalingRulesTable.$inferInsert;
