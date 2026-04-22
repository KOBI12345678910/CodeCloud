import { pgTable, uuid, varchar, text, timestamp, pgEnum, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const integrationProviderEnum = pgEnum("integration_provider", [
  "slack",
  "discord",
  "jira",
  "linear",
  "notion",
  "figma",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "pending",
  "connected",
  "error",
  "disconnected",
]);

export const projectIntegrationsTable = pgTable("project_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  installedBy: uuid("installed_by").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  provider: integrationProviderEnum("provider").notNull(),
  status: integrationStatusEnum("status").default("pending").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  webhookUrl: varchar("webhook_url", { length: 500 }),
  webhookSecret: varchar("webhook_secret", { length: 255 }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  externalAccountId: varchar("external_account_id", { length: 255 }),
  externalAccountName: varchar("external_account_name", { length: 255 }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("unique_project_provider").on(table.projectId, table.provider),
  index("idx_integrations_project").on(table.projectId),
  index("idx_integrations_provider").on(table.provider),
]);

export const insertProjectIntegrationSchema = createInsertSchema(projectIntegrationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ProjectIntegration = typeof projectIntegrationsTable.$inferSelect;
export type NewProjectIntegration = z.infer<typeof insertProjectIntegrationSchema>;
