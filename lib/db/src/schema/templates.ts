import { pgTable, text, uuid, varchar, boolean, integer, jsonb, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const templateDifficultyEnum = pgEnum("template_difficulty", ["beginner", "intermediate", "advanced"]);

export const templatesTable = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  description: text("description"),
  longDescription: text("long_description"),
  language: varchar("language", { length: 50 }).notNull(),
  framework: varchar("framework", { length: 50 }),
  category: varchar("category", { length: 50 }),
  iconUrl: text("icon_url"),
  bannerUrl: text("banner_url"),
  filesSnapshot: jsonb("files_snapshot").notNull(),
  runCommand: text("run_command").notNull(),
  buildCommand: text("build_command"),
  installCommand: text("install_command"),
  entryFile: varchar("entry_file", { length: 255 }).notNull(),
  port: integer("port"),
  envTemplate: jsonb("env_template").default([]),
  packages: jsonb("packages").default([]),
  dockerImage: varchar("docker_image", { length: 255 }).notNull(),
  gpuSupported: boolean("gpu_supported").default(false).notNull(),
  cudaVersion: varchar("cuda_version", { length: 20 }),
  difficulty: templateDifficultyEnum("difficulty").default("beginner").notNull(),
  estimatedSetupMin: integer("estimated_setup_min"),
  useCount: integer("use_count").default(0).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_templates_category").on(table.category),
  index("idx_templates_language").on(table.language),
  index("idx_templates_featured").on(table.isFeatured),
  index("idx_templates_active").on(table.isActive),
]);

export const insertTemplateSchema = createInsertSchema(templatesTable).omit({ id: true, createdAt: true });
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templatesTable.$inferSelect;
