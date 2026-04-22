import { pgTable, uuid, varchar, timestamp, text, integer, boolean } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const wikiPagesTable = pgTable("wiki_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 255 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull().default(""),
  parentId: uuid("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(false),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  updatedBy: varchar("updated_by", { length: 255 }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wikiPageVersionsTable = pgTable("wiki_page_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  pageId: uuid("page_id").notNull().references(() => wikiPagesTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  version: integer("version").notNull(),
  editedBy: varchar("edited_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
