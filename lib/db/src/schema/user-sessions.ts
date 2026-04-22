import { pgTable, uuid, varchar, boolean, timestamp, text, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userSessionsTable = pgTable("user_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenFamily: varchar("token_family", { length: 64 }),
  deviceInfo: text("device_info"),
  ipAddress: varchar("ip_address", { length: 45 }),
  location: varchar("location", { length: 200 }),
  userAgent: text("user_agent"),
  active: boolean("active").default(true).notNull(),
  lastActivity: timestamp("last_activity", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_user_sessions_user").on(table.userId),
  index("idx_user_sessions_active").on(table.active),
]);

export type UserSession = typeof userSessionsTable.$inferSelect;
