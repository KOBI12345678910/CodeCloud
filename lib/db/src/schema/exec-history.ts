import { pgTable, uuid, varchar, timestamp, text, integer } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const execHistoryTable = pgTable("exec_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull(),
  command: text("command").notNull(),
  output: text("output"),
  exitCode: integer("exit_code"),
  duration: integer("duration_ms"),
  cwd: text("cwd"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
