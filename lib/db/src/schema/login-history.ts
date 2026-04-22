import { pgTable, uuid, varchar, timestamp, text, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const loginHistoryTable = pgTable("login_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  success: boolean("success").notNull(),
  method: varchar("method", { length: 30 }).notNull().default("password"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  failReason: varchar("fail_reason", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_login_history_user").on(table.userId),
  index("idx_login_history_created").on(table.createdAt),
]);

export type LoginHistoryEntry = typeof loginHistoryTable.$inferSelect;
