import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const orgSecretsTable = pgTable("org_secrets", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
  description: text("description"),
  createdBy: uuid("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("unique_org_secret_key").on(table.orgId, table.key),
  index("idx_org_secrets_org").on(table.orgId),
]);

export const insertOrgSecretSchema = createInsertSchema(orgSecretsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrgSecret = z.infer<typeof insertOrgSecretSchema>;
export type OrgSecret = typeof orgSecretsTable.$inferSelect;
