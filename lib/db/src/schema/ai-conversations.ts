import { pgTable, text, uuid, varchar, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const aiConversationsTable = pgTable("ai_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  messages: jsonb("messages").default([]).notNull(),
  model: varchar("model", { length: 50 }).default("claude-3-sonnet").notNull(),
  tokenCount: jsonb("token_count").default({ input: 0, output: 0 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_ai_conversations_user").on(table.userId),
  index("idx_ai_conversations_project").on(table.projectId),
]);

export const insertAiConversationSchema = createInsertSchema(aiConversationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
export type AiConversation = typeof aiConversationsTable.$inferSelect;
