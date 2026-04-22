import { pgTable, text, uuid, varchar, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const consentCategoryEnum = pgEnum("consent_category", ["necessary", "analytics", "marketing"]);

export const userConsentsTable = pgTable("user_consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 255 }),
  category: consentCategoryEnum("category").notNull(),
  granted: boolean("granted").notNull(),
  version: varchar("version", { length: 20 }).default("1.0").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_consent_user").on(table.userId),
  index("idx_consent_category").on(table.category),
  index("idx_consent_session").on(table.sessionId),
]);

export const insertUserConsentSchema = createInsertSchema(userConsentsTable).omit({ id: true, createdAt: true });
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type UserConsent = typeof userConsentsTable.$inferSelect;
