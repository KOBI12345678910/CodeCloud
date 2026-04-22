import { pgTable, uuid, varchar, text, bigint, timestamp, pgEnum, index, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const ledgerEntryKindEnum = pgEnum("ledger_entry_kind", [
  "topup",
  "subscription_grant",
  "promo_grant",
  "admin_grant",
  "task_debit",
  "task_refund",
  "stripe_refund",
  "adjustment",
]);

export const creditsLedgerTable = pgTable("credits_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  kind: ledgerEntryKindEnum("kind").notNull(),
  amountMicroUsd: bigint("amount_micro_usd", { mode: "number" }).notNull(),
  taskId: uuid("task_id"),
  invoiceId: uuid("invoice_id"),
  stripeEventId: varchar("stripe_event_id", { length: 255 }),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_credits_ledger_user").on(t.userId),
  index("idx_credits_ledger_user_created").on(t.userId, t.createdAt),
  index("idx_credits_ledger_task").on(t.taskId),
  index("idx_credits_ledger_stripe_event").on(t.stripeEventId),
]);

export type CreditsLedgerEntry = typeof creditsLedgerTable.$inferSelect;
export type InsertCreditsLedgerEntry = typeof creditsLedgerTable.$inferInsert;

export const autoTopupSettingsTable = pgTable("auto_topup_settings", {
  userId: uuid("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  enabled: bigint("enabled", { mode: "number" }).default(0).notNull(),
  thresholdMicroUsd: bigint("threshold_micro_usd", { mode: "number" }).default(2_000_000).notNull(),
  topupAmountMicroUsd: bigint("topup_amount_micro_usd", { mode: "number" }).default(20_000_000).notNull(),
  lowBalanceWarnMicroUsd: bigint("low_balance_warn_micro_usd", { mode: "number" }).default(5_000_000).notNull(),
  stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 255 }),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type AutoTopupSettings = typeof autoTopupSettingsTable.$inferSelect;
