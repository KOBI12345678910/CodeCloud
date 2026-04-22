import { pgTable, text, uuid, varchar, integer, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { filesTable } from "./files";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const fileChangeTypeEnum = pgEnum("file_change_type", ["create", "update", "delete", "rename"]);

export const fileVersionsTable = pgTable("file_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileId: uuid("file_id").notNull().references(() => filesTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  content: text("content"),
  diffFromPrevious: text("diff_from_previous"),
  changeType: fileChangeTypeEnum("change_type").default("update").notNull(),
  sizeBytes: integer("size_bytes").default(0).notNull(),
  createdBy: uuid("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  commitMessage: varchar("commit_message", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_file_versions_file").on(table.fileId),
  index("idx_file_versions_project").on(table.projectId),
]);

export const insertFileVersionSchema = createInsertSchema(fileVersionsTable).omit({ id: true, createdAt: true });
export type InsertFileVersion = z.infer<typeof insertFileVersionSchema>;
export type FileVersion = typeof fileVersionsTable.$inferSelect;
