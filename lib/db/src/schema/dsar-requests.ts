import { pgTable, text, uuid, varchar, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const dsarTypeEnum = pgEnum("dsar_type", ["export", "deletion"]);
export const dsarStatusEnum = pgEnum("dsar_status", ["pending", "processing", "completed", "failed", "cancelled"]);

export const dsarRequestsTable = pgTable("dsar_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: dsarTypeEnum("type").notNull(),
  status: dsarStatusEnum("status").default("pending").notNull(),
  reason: text("reason"),
  downloadUrl: text("download_url"),
  scheduledPurgeAt: timestamp("scheduled_purge_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_dsar_user").on(table.userId),
  index("idx_dsar_status").on(table.status),
  index("idx_dsar_type").on(table.type),
]);

export const insertDsarRequestSchema = createInsertSchema(dsarRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDsarRequest = z.infer<typeof insertDsarRequestSchema>;
export type DsarRequest = typeof dsarRequestsTable.$inferSelect;
