import { pgTable, text, uuid, varchar, boolean, timestamp, integer, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const webhookEventEnum = pgEnum("webhook_event", [
  "push",
  "deploy",
  "star",
  "fork",
  "project.create",
  "project.update",
  "project.delete",
  "collaborator.add",
  "collaborator.remove",
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "success",
  "failed",
]);

export const webhooksTable = pgTable("webhooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 500 }).notNull(),
  secret: varchar("secret", { length: 255 }).notNull(),
  events: text("events").notNull().default("[]"),
  isActive: boolean("is_active").default(true).notNull(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_webhooks_user").on(table.userId),
  index("idx_webhooks_project").on(table.projectId),
]);

export const webhookDeliveriesTable = pgTable("webhook_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  webhookId: uuid("webhook_id").notNull().references(() => webhooksTable.id, { onDelete: "cascade" }),
  event: varchar("event", { length: 50 }).notNull(),
  payload: text("payload").notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  status: deliveryStatusEnum("status").default("pending").notNull(),
  statusCode: integer("status_code"),
  responseBody: text("response_body"),
  errorMessage: text("error_message"),
  attempts: integer("attempts").default(0).notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_webhook_deliveries_webhook").on(table.webhookId),
  index("idx_webhook_deliveries_status").on(table.status),
]);

export const insertWebhookSchema = createInsertSchema(webhooksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooksTable.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveriesTable.$inferSelect;
