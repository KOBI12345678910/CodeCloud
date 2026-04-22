import { pgTable, text, uuid, varchar, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const consoleHistoryTable = pgTable("console_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  command: text("command").notNull(),
  output: text("output"),
  exitCode: integer("exit_code"),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_console_history_project").on(table.projectId),
  index("idx_console_history_user").on(table.userId),
]);

export const insertConsoleHistorySchema = createInsertSchema(consoleHistoryTable).omit({ id: true, executedAt: true });
export type InsertConsoleHistory = z.infer<typeof insertConsoleHistorySchema>;
export type ConsoleHistory = typeof consoleHistoryTable.$inferSelect;
