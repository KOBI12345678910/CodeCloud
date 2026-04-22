import { pgTable, uuid, varchar, timestamp, text, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const loginHistoryTable = pgTable("login_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 30 }).notNull(),
  success: boolean("success").notNull().default(true),
  method: varchar("method", { length: 30 }).notNull().default("password"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_login_history_user").on(table.userId),
  index("idx_login_history_created").on(table.createdAt),
]);

export type LoginHistory = typeof loginHistoryTable.$inferSelect;
export type LoginHistoryEntry = LoginHistory;
