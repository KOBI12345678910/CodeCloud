import { pgTable, uuid, varchar, timestamp, pgEnum, index, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const certStatusEnum = pgEnum("cert_status", ["pending", "issuing", "active", "expiring", "expired", "failed", "revoked"]);

export const sslCertificatesTable = pgTable("ssl_certificates", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  domain: varchar("domain", { length: 255 }).notNull(),
  status: certStatusEnum("cert_status").default("pending").notNull(),
  issuer: varchar("issuer", { length: 100 }).default("Let's Encrypt"),
  serialNumber: varchar("serial_number", { length: 100 }),
  fingerprint: varchar("fingerprint", { length: 128 }),
  forceHttps: boolean("force_https").default(true).notNull(),
  autoRenew: boolean("auto_renew").default(true).notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastRenewalAt: timestamp("last_renewal_at", { withTimezone: true }),
  lastRenewalError: text("last_renewal_error"),
  dnsVerified: boolean("dns_verified").default(false).notNull(),
  verificationToken: varchar("verification_token", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_ssl_project").on(table.projectId),
  index("idx_ssl_domain").on(table.domain),
  index("idx_ssl_status").on(table.status),
]);

export const insertSslCertificateSchema = createInsertSchema(sslCertificatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSslCertificate = z.infer<typeof insertSslCertificateSchema>;
export type SslCertificate = typeof sslCertificatesTable.$inferSelect;
