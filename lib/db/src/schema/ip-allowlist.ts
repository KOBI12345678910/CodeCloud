import { pgTable, uuid, varchar, boolean, timestamp, text, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const ipAllowlistTable = pgTable("ip_allowlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 10 }).default("allow").notNull(),
  cidr: varchar("cidr", { length: 50 }).notNull(),
  label: varchar("label", { length: 100 }),
  description: text("description"),
  enabled: boolean("enabled").default(true).notNull(),
  note: text("note"),
  createdBy: uuid("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_ip_allowlist_org").on(table.orgId),
]);

export type IPAllowlistEntry = typeof ipAllowlistTable.$inferSelect;
