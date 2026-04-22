import { pgTable, uuid, varchar, timestamp, text, integer, pgEnum, index } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { todosTable } from "./todos";

export const milestoneStatusEnum = pgEnum("milestone_status", ["open", "closed"]);

export const milestonesTable = pgTable("milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: milestoneStatusEnum("status").default("open").notNull(),
  progress: integer("progress").default(0).notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_milestones_project").on(table.projectId),
  index("idx_milestones_status").on(table.status),
  index("idx_milestones_due_date").on(table.dueDate),
]);

export const milestoneTasks = pgTable("milestone_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  milestoneId: uuid("milestone_id").notNull().references(() => milestonesTable.id, { onDelete: "cascade" }),
  todoId: uuid("todo_id").notNull().references(() => todosTable.id, { onDelete: "cascade" }),
  linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_milestone_tasks_milestone").on(table.milestoneId),
  index("idx_milestone_tasks_todo").on(table.todoId),
]);
