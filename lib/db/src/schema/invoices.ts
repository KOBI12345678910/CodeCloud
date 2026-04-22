import { pgTable, uuid, varchar, text, bigint, timestamp, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "open", "paid", "void", "uncollectible", "refunded"]);

export const billingInvoicesTable = pgTable("billing_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  number: varchar("number", { length: 60 }).notNull(),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }).unique(),
  stripeEventId: varchar("stripe_event_id", { length: 255 }).unique(),
  status: invoiceStatusEnum("status").default("open").notNull(),
  amountMicroUsd: bigint("amount_micro_usd", { mode: "number" }).notNull(),
  taxMicroUsd: bigint("tax_micro_usd", { mode: "number" }).default(0).notNull(),
  totalMicroUsd: bigint("total_micro_usd", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 8 }).default("usd").notNull(),
  description: text("description"),
  lineItems: jsonb("line_items").default([]).notNull(),
  pdfHash: varchar("pdf_hash", { length: 80 }),
  pdfStorageKey: varchar("pdf_storage_key", { length: 255 }),
  hostedUrl: text("hosted_url"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_billing_invoices_user").on(t.userId),
  index("idx_billing_invoices_status").on(t.status),
]);

export type BillingInvoice = typeof billingInvoicesTable.$inferSelect;

export const billingEventsTable = pgTable("billing_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  stripeEventId: varchar("stripe_event_id", { length: 255 }).unique().notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  payload: jsonb("payload").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_billing_events_type").on(t.type),
  index("idx_billing_events_processed").on(t.processedAt),
]);

export type BillingEvent = typeof billingEventsTable.$inferSelect;

export const pricingVersionsTable = pgTable("pricing_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: bigint("version", { mode: "number" }).unique().notNull(),
  prices: jsonb("prices").notNull(),
  marginBps: bigint("margin_bps", { mode: "number" }).default(2000).notNull(),
  notes: text("notes"),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PricingVersion = typeof pricingVersionsTable.$inferSelect;

export const adminAuditTable = pgTable("admin_audit", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminUserId: uuid("admin_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 80 }).notNull(),
  targetUserId: uuid("target_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("idx_admin_audit_admin").on(t.adminUserId)]);

export type AdminAudit = typeof adminAuditTable.$inferSelect;
