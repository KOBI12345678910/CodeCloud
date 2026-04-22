import { pgTable, text, uuid, varchar, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const githubWebhooksTable = pgTable("github_webhooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  githubDeliveryId: varchar("github_delivery_id", { length: 255 }).unique(),
  event: varchar("event", { length: 100 }).notNull(),
  action: varchar("action", { length: 100 }),
  repositoryId: varchar("repository_id", { length: 255 }),
  repositoryName: varchar("repository_name", { length: 255 }),
  senderLogin: varchar("sender_login", { length: 100 }),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").default(false).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_github_webhooks_project").on(table.projectId),
  index("idx_github_webhooks_event").on(table.event),
  index("idx_github_webhooks_processed").on(table.processed),
]);

export const insertGithubWebhookSchema = createInsertSchema(githubWebhooksTable).omit({ id: true, createdAt: true });
export type InsertGithubWebhook = z.infer<typeof insertGithubWebhookSchema>;
export type GithubWebhook = typeof githubWebhooksTable.$inferSelect;
