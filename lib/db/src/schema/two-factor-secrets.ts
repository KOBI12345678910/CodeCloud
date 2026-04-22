import { pgTable, uuid, varchar, boolean, timestamp, text, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const twoFactorSecretsTable = pgTable("two_factor_secrets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  secret: text("secret").notNull(),
  method: varchar("method", { length: 20 }).default("totp").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  backupCodes: text("backup_codes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_two_factor_user").on(table.userId),
]);

export type TwoFactorSecret = typeof twoFactorSecretsTable.$inferSelect;
