import { pgTable, text, uuid, varchar, boolean, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const filesTable = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  path: varchar("path", { length: 500 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: uuid("parent_id"),
  isDirectory: boolean("is_directory").default(false).notNull(),
  content: text("content"),
  binaryUrl: text("binary_url"),
  sizeBytes: integer("size_bytes").default(0).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("unique_project_path").on(table.projectId, table.path),
  index("idx_files_project").on(table.projectId),
]);

export const insertFileSchema = createInsertSchema(filesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFile = z.infer<typeof insertFileSchema>;
export type FileRecord = typeof filesTable.$inferSelect;
