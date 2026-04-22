import { pgTable, text, uuid, varchar, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectSecretsTable = pgTable("project_secrets", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 255 }).notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  environment: varchar("environment", { length: 20 }).default("development").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("unique_project_secret_key_env").on(table.projectId, table.key, table.environment),
  index("idx_project_secrets_project").on(table.projectId),
  index("idx_project_secrets_env").on(table.projectId, table.environment),
]);

export const insertProjectSecretSchema = createInsertSchema(projectSecretsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectSecret = z.infer<typeof insertProjectSecretSchema>;
export type ProjectSecret = typeof projectSecretsTable.$inferSelect;
