import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const sslStatusEnum = pgEnum("ssl_status", ["pending", "provisioning", "active", "failed"]);

export const domainsTable = pgTable("domains", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  sslStatus: sslStatusEnum("ssl_status").default("pending").notNull(),
  dnsVerified: boolean("dns_verified").default(false).notNull(),
  verificationRecord: text("verification_record"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_domains_project").on(table.projectId),
]);

export type Domain = typeof domainsTable.$inferSelect;
