import { pgTable, text, uuid, varchar, timestamp, index, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const issueStatusEnum = pgEnum("issue_status", ["open", "in-progress", "closed"]);
export const issueLabelEnum = pgEnum("issue_label", ["bug", "feature", "improvement"]);

export const issuesTable = pgTable("issues", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: issueStatusEnum("status").notNull().default("open"),
  label: issueLabelEnum("label").notNull().default("bug"),
  assigneeId: uuid("assignee_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  codeReferences: jsonb("code_references").$type<Array<{ filePath: string; lineStart: number; lineEnd?: number }>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_issues_project").on(table.projectId),
  index("idx_issues_status").on(table.status),
  index("idx_issues_label").on(table.label),
  index("idx_issues_assignee").on(table.assigneeId),
  index("idx_issues_created_by").on(table.createdBy),
]);

export const insertIssueSchema = createInsertSchema(issuesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issuesTable.$inferSelect;
