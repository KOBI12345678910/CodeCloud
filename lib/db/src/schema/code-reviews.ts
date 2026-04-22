import { pgTable, text, uuid, varchar, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { filesTable } from "./files";

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "in_review",
  "approved",
  "changes_requested",
  "dismissed",
]);

export const codeReviewsTable = pgTable("code_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  requesterId: uuid("requester_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: reviewStatusEnum("status").default("pending").notNull(),
  branch: varchar("branch", { length: 100 }),
  commitHash: varchar("commit_hash", { length: 40 }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_reviews_project").on(table.projectId),
  index("idx_reviews_requester").on(table.requesterId),
  index("idx_reviews_reviewer").on(table.reviewerId),
  index("idx_reviews_status").on(table.status),
]);

export const insertCodeReviewSchema = createInsertSchema(codeReviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCodeReview = z.infer<typeof insertCodeReviewSchema>;
export type CodeReview = typeof codeReviewsTable.$inferSelect;

export const reviewCommentsTable = pgTable("review_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  reviewId: uuid("review_id").notNull().references(() => codeReviewsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  fileId: uuid("file_id").references(() => filesTable.id, { onDelete: "set null" }),
  filePath: varchar("file_path", { length: 500 }),
  lineNumber: integer("line_number"),
  lineEndNumber: integer("line_end_number"),
  content: text("content").notNull(),
  resolved: varchar("resolved", { length: 10 }).default("false").notNull(),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_review_comments_review").on(table.reviewId),
  index("idx_review_comments_file").on(table.fileId),
]);

export const insertReviewCommentSchema = createInsertSchema(reviewCommentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReviewComment = z.infer<typeof insertReviewCommentSchema>;
export type ReviewComment = typeof reviewCommentsTable.$inferSelect;
