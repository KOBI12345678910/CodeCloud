import { pgTable, uuid, varchar, boolean, timestamp, text, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const twoFactorTable = pgTable("two_factor", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  secret: varchar("secret", { length: 255 }).notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  backupCodes: text("backup_codes"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_two_factor_user").on(table.userId),
]);

export type TwoFactor = typeof twoFactorTable.$inferSelect;
