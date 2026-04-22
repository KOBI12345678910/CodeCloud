import { pgTable, uuid, varchar, boolean, timestamp, text, jsonb, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const ssoConfigurationsTable = pgTable("sso_configurations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 20 }).notNull(),
  entityId: text("entity_id").notNull(),
  loginUrl: text("login_url").notNull(),
  certificate: text("certificate").notNull(),
  metadataXml: text("metadata_xml"),
  acsUrl: text("acs_url"),
  spEntityId: text("sp_entity_id"),
  attributeMapping: jsonb("attribute_mapping").default({}),
  enabled: boolean("enabled").default(true).notNull(),
  enforced: boolean("enforced").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_sso_config_org").on(table.orgId),
]);

export type SSOConfiguration = typeof ssoConfigurationsTable.$inferSelect;
