import { pgTable, uuid, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const dataRetentionPoliciesTable = pgTable("data_retention_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }).unique(),
  autoArchiveDays: integer("auto_archive_days"),
  autoDeleteDays: integer("auto_delete_days"),
  notifyBeforeDays: integer("notify_before_days").default(7).notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_retention_org").on(table.orgId),
]);

export const insertDataRetentionPolicySchema = createInsertSchema(dataRetentionPoliciesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDataRetentionPolicy = z.infer<typeof insertDataRetentionPolicySchema>;
export type DataRetentionPolicy = typeof dataRetentionPoliciesTable.$inferSelect;
