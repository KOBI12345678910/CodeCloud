import { pgTable, text, uuid, varchar, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const architecturePlansTable = pgTable("architecture_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  techStack: jsonb("tech_stack").default([]).notNull(),
  fileTree: jsonb("file_tree").default([]).notNull(),
  schema: jsonb("schema").default({ tables: [], relationships: [] }).notNull(),
  endpoints: jsonb("endpoints").default([]).notNull(),
  components: jsonb("components").default([]).notNull(),
  scaffolded: jsonb("scaffolded").default({ done: false, fileCount: 0 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_architecture_plans_user").on(table.userId),
  index("idx_architecture_plans_project").on(table.projectId),
]);

export const insertArchitecturePlanSchema = createInsertSchema(architecturePlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArchitecturePlan = z.infer<typeof insertArchitecturePlanSchema>;
export type ArchitecturePlan = typeof architecturePlansTable.$inferSelect;
