import { pgTable, uuid, varchar, timestamp, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";

export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"]);

export const orgMembersTable = pgTable("org_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: orgRoleEnum("org_role").default("member").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("unique_org_member").on(table.orgId, table.userId),
  index("idx_org_members_user").on(table.userId),
]);

export const insertOrgMemberSchema = createInsertSchema(orgMembersTable).omit({ id: true, createdAt: true });
export type InsertOrgMember = z.infer<typeof insertOrgMemberSchema>;
export type OrgMember = typeof orgMembersTable.$inferSelect;
