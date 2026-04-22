import { pgTable, uuid, varchar, text, integer, bigint, timestamp, real, jsonb, index } from "drizzle-orm/pg-core";
import { agentTasksTable } from "./agent-tasks";
import { usersTable } from "./users";

export const taskUsageTable = pgTable("task_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => agentTasksTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").default(0).notNull(),
  kind: varchar("kind", { length: 40 }).notNull(),
  model: varchar("model", { length: 80 }),
  provider: varchar("provider", { length: 60 }),
  endpoint: varchar("endpoint", { length: 200 }),
  inputTokens: integer("input_tokens").default(0).notNull(),
  outputTokens: integer("output_tokens").default(0).notNull(),
  cachedInputTokens: integer("cached_input_tokens").default(0).notNull(),
  computeMs: integer("compute_ms").default(0).notNull(),
  peakMemoryMb: real("peak_memory_mb").default(0).notNull(),
  storageDeltaMb: real("storage_delta_mb").default(0).notNull(),
  costMicroUsd: bigint("cost_micro_usd", { mode: "number" }).default(0).notNull(),
  pricingVersion: integer("pricing_version").default(1).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_task_usage_task").on(t.taskId, t.stepIndex),
  index("idx_task_usage_user_created").on(t.userId, t.createdAt),
  index("idx_task_usage_kind").on(t.kind),
]);

export type TaskUsage = typeof taskUsageTable.$inferSelect;
export type InsertTaskUsage = typeof taskUsageTable.$inferInsert;

export const taskCheckpointUsageTable = pgTable("task_checkpoint_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => agentTasksTable.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").notNull(),
  totalCostMicroUsd: bigint("total_cost_micro_usd", { mode: "number" }).default(0).notNull(),
  inputTokens: integer("input_tokens").default(0).notNull(),
  outputTokens: integer("output_tokens").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("idx_task_cp_usage_task").on(t.taskId, t.stepIndex)]);

export type TaskCheckpointUsage = typeof taskCheckpointUsageTable.$inferSelect;
