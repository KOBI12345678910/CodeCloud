import { pgTable, uuid, varchar, timestamp, pgEnum, index, text, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const networkPolicyEnum = pgEnum("network_policy", ["allow_all", "deny_all", "custom"]);

export const containerNetworksTable = pgTable("container_networks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  ownerId: varchar("owner_id", { length: 255 }).notNull(),
  subnet: varchar("subnet", { length: 50 }).notNull(),
  policy: networkPolicyEnum("policy").default("allow_all").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_network_owner").on(table.ownerId),
  index("idx_network_name").on(table.name),
]);

export const networkMembersTable = pgTable("network_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  networkId: uuid("network_id").notNull().references(() => containerNetworksTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  hostname: varchar("hostname", { length: 100 }).notNull(),
  internalIp: varchar("internal_ip", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_member_network").on(table.networkId),
  index("idx_member_project").on(table.projectId),
]);

export const exposedPortsTable = pgTable("exposed_ports", {
  id: uuid("id").defaultRandom().primaryKey(),
  networkId: uuid("network_id").notNull().references(() => containerNetworksTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  port: integer("port").notNull(),
  protocol: varchar("protocol", { length: 10 }).default("tcp").notNull(),
  serviceName: varchar("service_name", { length: 100 }),
  description: text("description"),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_port_network").on(table.networkId),
  index("idx_port_project").on(table.projectId),
]);

export const networkPoliciesTable = pgTable("network_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  networkId: uuid("network_id").notNull().references(() => containerNetworksTable.id, { onDelete: "cascade" }),
  sourceProjectId: uuid("source_project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  targetProjectId: uuid("target_project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 10 }).notNull(),
  ports: jsonb("ports"),
  priority: integer("priority").default(100).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_policy_network").on(table.networkId),
]);

export const insertContainerNetworkSchema = createInsertSchema(containerNetworksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContainerNetwork = z.infer<typeof insertContainerNetworkSchema>;
export type ContainerNetwork = typeof containerNetworksTable.$inferSelect;

export const insertNetworkMemberSchema = createInsertSchema(networkMembersTable).omit({ id: true, joinedAt: true });
export type InsertNetworkMember = z.infer<typeof insertNetworkMemberSchema>;
export type NetworkMember = typeof networkMembersTable.$inferSelect;

export const insertExposedPortSchema = createInsertSchema(exposedPortsTable).omit({ id: true, createdAt: true });
export type InsertExposedPort = z.infer<typeof insertExposedPortSchema>;
export type ExposedPort = typeof exposedPortsTable.$inferSelect;

export const insertNetworkPolicySchema = createInsertSchema(networkPoliciesTable).omit({ id: true, createdAt: true });
export type InsertNetworkPolicy = z.infer<typeof insertNetworkPolicySchema>;
export type NetworkPolicy = typeof networkPoliciesTable.$inferSelect;
