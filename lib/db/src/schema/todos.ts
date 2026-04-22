import { pgTable, uuid, varchar, timestamp, text, integer, boolean } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const todosTable = pgTable("todos", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  assignedTo: varchar("assigned_to", { length: 255 }),
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull().default("todo"),
  dueDate: timestamp("due_date"),
  sourceFile: text("source_file"),
  sourceLine: integer("source_line"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
