import { pgTable, uuid, boolean, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const orgPoliciesTable = pgTable("org_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }).unique(),
  require2fa: boolean("require_2fa").default(false).notNull(),
  defaultMemberRole: varchar("default_member_role", { length: 20 }).default("member").notNull(),
  projectVisibility: varchar("project_visibility", { length: 20 }).default("private").notNull(),
  apiAccessEnabled: boolean("api_access_enabled").default(true).notNull(),
  ipAllowlistEnabled: boolean("ip_allowlist_enabled").default(false).notNull(),
  sessionTimeoutMinutes: varchar("session_timeout_minutes", { length: 10 }).default("480").notNull(),
  allowedAuthMethods: jsonb("allowed_auth_methods").default(["local", "google", "github"]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_org_policies_org").on(table.orgId),
]);

export type OrgPolicy = typeof orgPoliciesTable.$inferSelect;
