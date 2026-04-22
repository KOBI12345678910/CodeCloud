import { pgTable, uuid, varchar, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const transferStatusEnum = pgEnum("transfer_status", ["pending", "accepted", "declined", "cancelled", "expired"]);

export const projectTransfersTable = pgTable("project_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  fromUserId: uuid("from_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  toUserId: uuid("to_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  toEmail: varchar("to_email", { length: 255 }).notNull(),
  status: transferStatusEnum("status").default("pending").notNull(),
  token: varchar("token", { length: 128 }).unique().notNull(),
  message: varchar("message", { length: 500 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_transfers_project").on(table.projectId),
  index("idx_transfers_from").on(table.fromUserId),
  index("idx_transfers_to").on(table.toUserId),
  index("idx_transfers_token").on(table.token),
]);

export const insertProjectTransferSchema = createInsertSchema(projectTransfersTable).omit({ id: true, createdAt: true });
export type InsertProjectTransfer = z.infer<typeof insertProjectTransferSchema>;
export type ProjectTransfer = typeof projectTransfersTable.$inferSelect;
