import { pgTable, text, uuid, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { filesTable } from "./files";
import { issuesTable } from "./issues";

export const commentsTable = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  fileId: uuid("file_id").references(() => filesTable.id, { onDelete: "cascade" }),
  issueId: uuid("issue_id").references(() => issuesTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  lineNumber: integer("line_number"),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_comments_project").on(table.projectId),
  index("idx_comments_file").on(table.fileId),
  index("idx_comments_issue").on(table.issueId),
]);

export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof commentsTable.$inferSelect;
