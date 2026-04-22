import { pgTable, text, uuid, varchar, boolean, timestamp, pgEnum, uniqueIndex, index, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { templatesTable } from "./templates";
import { organizationsTable } from "./organizations";

export const containerStatusEnum = pgEnum("container_status", ["stopped", "starting", "running", "error"]);
export const resourceTierEnum = pgEnum("resource_tier", ["free", "small", "medium", "large", "xlarge"]);

export const projectsTable = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").references(() => organizationsTable.id, { onDelete: "set null" }),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  description: text("description"),
  readmeContent: text("readme_content"),
  language: varchar("language", { length: 50 }).notNull(),
  framework: varchar("framework", { length: 50 }),
  templateId: uuid("template_id").references(() => templatesTable.id),
  isPublic: boolean("is_public").default(true).notNull(),
  isTemplate: boolean("is_template").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  forkedFromId: uuid("forked_from_id"),
  clonedFromId: uuid("cloned_from_id"),
  cloneCount: integer("clone_count").default(0).notNull(),
  forkCount: integer("fork_count").default(0).notNull(),
  starCount: integer("star_count").default(0).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  runCommand: text("run_command"),
  buildCommand: text("build_command"),
  installCommand: text("install_command"),
  outputDir: varchar("output_dir", { length: 255 }),
  port: integer("port"),
  testCommand: text("test_command"),
  entryFile: varchar("entry_file", { length: 255 }).default("index.js").notNull(),
  containerStatus: containerStatusEnum("container_status").default("stopped").notNull(),
  containerId: varchar("container_id", { length: 255 }),
  containerStartedAt: timestamp("container_started_at", { withTimezone: true }),
  containerLastActive: timestamp("container_last_active", { withTimezone: true }),
  gpuEnabled: boolean("gpu_enabled").default(false).notNull(),
  resourceTier: resourceTierEnum("resource_tier").default("free").notNull(),
  deployedUrl: varchar("deployed_url", { length: 255 }),
  githubRepoUrl: varchar("github_repo_url", { length: 500 }),
  githubRepoId: varchar("github_repo_id", { length: 255 }),
  githubBranch: varchar("github_branch", { length: 255 }).default("main"),
  githubLastSyncAt: timestamp("github_last_sync_at", { withTimezone: true }),
  autoCommit: boolean("auto_commit").default(false).notNull(),
  tags: jsonb("tags").default([]).notNull(),
  thumbnailUrl: text("thumbnail_url"),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("unique_owner_slug").on(table.ownerId, table.slug),
  index("idx_projects_owner").on(table.ownerId),
  index("idx_projects_org").on(table.orgId),
  index("idx_projects_template").on(table.templateId),
  index("idx_projects_public").on(table.isPublic),
  index("idx_projects_archived").on(table.isArchived),
  index("idx_projects_language").on(table.language),
  index("idx_projects_github_repo").on(table.githubRepoId),
]);

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
