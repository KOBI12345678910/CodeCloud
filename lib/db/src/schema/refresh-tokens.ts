import { pgTable, uuid, varchar, timestamp, boolean, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).unique().notNull(),
  family: varchar("family", { length: 64 }).notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RefreshToken = typeof refreshTokensTable.$inferSelect;
