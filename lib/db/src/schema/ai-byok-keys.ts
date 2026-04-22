import { pgTable, text, uuid, varchar, timestamp, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const aiByokKeysTable = pgTable("ai_byok_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 32 }).notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("unique_ai_byok_user_provider").on(table.userId, table.provider),
  index("idx_ai_byok_user").on(table.userId),
]);

export const aiUsageEventsTable = pgTable("ai_usage_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id"),
  modelId: varchar("model_id", { length: 64 }).notNull(),
  provider: varchar("provider", { length: 32 }).notNull(),
  mode: varchar("mode", { length: 16 }).notNull(),
  inputTokens: text("input_tokens").notNull(),
  outputTokens: text("output_tokens").notNull(),
  costUsd: text("cost_usd").notNull(),
  latencyMs: text("latency_ms").notNull(),
  cacheHit: text("cache_hit").notNull(),
  byok: text("byok").notNull(),
  servedByFallback: text("served_by_fallback").notNull(),
  taskType: varchar("task_type", { length: 32 }).notNull(),
  rubric: jsonb("rubric"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_ai_usage_user_time").on(table.userId, table.createdAt),
  index("idx_ai_usage_model").on(table.modelId, table.createdAt),
]);
