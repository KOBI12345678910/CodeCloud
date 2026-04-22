import { pgTable, text, uuid, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const oauthAppsTable = pgTable("oauth_apps", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  clientId: varchar("client_id", { length: 64 }).notNull().unique(),
  clientSecretHash: varchar("client_secret_hash", { length: 255 }).notNull(),
  clientSecretPrefix: varchar("client_secret_prefix", { length: 12 }).notNull(),
  redirectUris: text("redirect_uris").notNull().default("[]"),
  homepage: varchar("homepage", { length: 500 }),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_oauth_apps_user").on(table.userId),
  index("idx_oauth_apps_client_id").on(table.clientId),
]);

export const oauthAuthorizationsTable = pgTable("oauth_authorizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  appId: uuid("app_id").notNull().references(() => oauthAppsTable.id, { onDelete: "cascade" }),
  scopes: text("scopes").notNull().default("read"),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
  index("idx_oauth_auth_user").on(table.userId),
  index("idx_oauth_auth_app").on(table.appId),
]);

export const insertOauthAppSchema = createInsertSchema(oauthAppsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOauthApp = z.infer<typeof insertOauthAppSchema>;
export type OauthApp = typeof oauthAppsTable.$inferSelect;
export type OauthAuthorization = typeof oauthAuthorizationsTable.$inferSelect;
