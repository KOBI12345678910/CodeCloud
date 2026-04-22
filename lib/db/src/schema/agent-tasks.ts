import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, real, boolean, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { aiConversationsTable } from "./ai-conversations";

export const agentTaskStateEnum = pgEnum("agent_task_state", [
  "draft",
  "planned",
  "queued",
  "active",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
]);

export const agentTaskModeEnum = pgEnum("agent_task_mode", ["plan", "build", "background"]);
export const agentTaskTierEnum = pgEnum("agent_task_tier", ["standard", "power", "max"]);

export const agentTasksTable = pgTable("agent_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => aiConversationsTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  state: agentTaskStateEnum("state").default("queued").notNull(),
  mode: agentTaskModeEnum("mode").default("build").notNull(),
  tier: agentTaskTierEnum("tier").default("standard").notNull(),
  model: varchar("model", { length: 80 }).notNull(),
  plan: jsonb("plan"),
  result: text("result"),
  errorMessage: text("error_message"),
  inputTokens: integer("input_tokens").default(0).notNull(),
  outputTokens: integer("output_tokens").default(0).notNull(),
  costUsd: real("cost_usd").default(0).notNull(),
  actionCount: integer("action_count").default(0).notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_agent_tasks_project").on(table.projectId),
  index("idx_agent_tasks_user").on(table.userId),
  index("idx_agent_tasks_conv").on(table.conversationId),
  index("idx_agent_tasks_state").on(table.state),
]);

export const agentEventTypeEnum = pgEnum("agent_event_type", [
  "user_message",
  "assistant_message",
  "assistant_token",
  "tool_call",
  "tool_result",
  "tool_error",
  "state_change",
  "checkpoint",
  "rollback",
  "cost_update",
  "plan",
]);

export const agentEventsTable = pgTable("agent_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => agentTasksTable.id, { onDelete: "cascade" }),
  seq: integer("seq").notNull(),
  type: agentEventTypeEnum("type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_agent_events_task").on(table.taskId, table.seq),
]);

export const agentCheckpointsTable = pgTable("agent_checkpoints", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => agentTasksTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 200 }).notNull(),
  fileSnapshot: jsonb("file_snapshot").notNull(),
  fileCount: integer("file_count").default(0).notNull(),
  isFinal: boolean("is_final").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_agent_checkpoints_task").on(table.taskId),
  index("idx_agent_checkpoints_project").on(table.projectId),
]);

export const insertAgentTaskSchema = createInsertSchema(agentTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAgentTask = z.infer<typeof insertAgentTaskSchema>;
export type AgentTask = typeof agentTasksTable.$inferSelect;
export type AgentEvent = typeof agentEventsTable.$inferSelect;
export type AgentCheckpoint = typeof agentCheckpointsTable.$inferSelect;
