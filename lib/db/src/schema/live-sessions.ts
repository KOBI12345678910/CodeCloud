import { pgTable, text, uuid, varchar, boolean, timestamp, pgEnum, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const sessionStatusEnum = pgEnum("live_session_status", ["active", "paused", "ended"]);

export const liveSessionsTable = pgTable("live_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  hostId: uuid("host_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  shareCode: varchar("share_code", { length: 20 }).notNull().unique(),
  status: sessionStatusEnum("status").default("active").notNull(),
  maxParticipants: integer("max_participants").default(50).notNull(),
  allowChat: boolean("allow_chat").default(true).notNull(),
  defaultRole: varchar("default_role", { length: 20 }).default("spectator").notNull(),
  activeFile: varchar("active_file", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
}, (table) => [
  index("idx_live_sessions_project").on(table.projectId),
  index("idx_live_sessions_host").on(table.hostId),
  index("idx_live_sessions_share_code").on(table.shareCode),
  index("idx_live_sessions_status").on(table.status),
]);

export const insertLiveSessionSchema = createInsertSchema(liveSessionsTable).omit({ id: true, createdAt: true });
export type InsertLiveSession = z.infer<typeof insertLiveSessionSchema>;
export type LiveSession = typeof liveSessionsTable.$inferSelect;

export const sessionParticipantsTable = pgTable("session_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => liveSessionsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).default("spectator").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp("left_at", { withTimezone: true }),
}, (table) => [
  index("idx_session_participants_session").on(table.sessionId),
  index("idx_session_participants_user").on(table.userId),
]);

export const insertSessionParticipantSchema = createInsertSchema(sessionParticipantsTable).omit({ id: true, joinedAt: true });
export type InsertSessionParticipant = z.infer<typeof insertSessionParticipantSchema>;
export type SessionParticipant = typeof sessionParticipantsTable.$inferSelect;

export const sessionChatTable = pgTable("session_chat", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => liveSessionsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_session_chat_session").on(table.sessionId),
]);

export const insertSessionChatSchema = createInsertSchema(sessionChatTable).omit({ id: true, createdAt: true });
export type InsertSessionChat = z.infer<typeof insertSessionChatSchema>;
export type SessionChat = typeof sessionChatTable.$inferSelect;
