import { pgTable, uuid, varchar, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const inviteStatusEnum = pgEnum("invite_status", ["pending", "accepted", "declined", "expired"]);

export const orgInvitesTable = pgTable("org_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  status: inviteStatusEnum("status").default("pending").notNull(),
  invitedBy: uuid("invited_by").notNull().references(() => usersTable.id),
  token: varchar("token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_org_invites_org").on(table.orgId),
  index("idx_org_invites_email").on(table.email),
  index("idx_org_invites_token").on(table.token),
]);

export const insertOrgInviteSchema = createInsertSchema(orgInvitesTable).omit({ id: true, createdAt: true });
export type InsertOrgInvite = z.infer<typeof insertOrgInviteSchema>;
export type OrgInvite = typeof orgInvitesTable.$inferSelect;
