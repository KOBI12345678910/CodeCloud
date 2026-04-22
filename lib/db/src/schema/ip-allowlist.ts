import { pgTable, uuid, varchar, timestamp, text, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const ipAllowlistTable = pgTable("ip_allowlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  cidr: varchar("cidr", { length: 50 }).notNull(),
  label: varchar("label", { length: 100 }),
  createdBy: uuid("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
}, (table) => [
  index("idx_ip_allowlist_org").on(table.orgId),
]);

export type IpAllowlistEntry = typeof ipAllowlistTable.$inferSelect;
