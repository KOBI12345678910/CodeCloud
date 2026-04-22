import { pgTable, uuid, varchar, timestamp, text, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const activeSessionsTable = pgTable("active_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenFamily: varchar("token_family", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceLabel: varchar("device_label", { length: 255 }),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  isCurrent: boolean("is_current").default(false).notNull(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
  index("idx_active_sessions_user").on(table.userId),
  index("idx_active_sessions_family").on(table.tokenFamily),
]);

export type ActiveSession = typeof activeSessionsTable.$inferSelect;
