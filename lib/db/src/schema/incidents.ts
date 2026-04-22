import { pgTable, uuid, varchar, timestamp, text, integer, boolean } from "drizzle-orm/pg-core";

export const incidentsTable = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("minor"),
  status: varchar("status", { length: 30 }).notNull().default("investigating"),
  affectedServices: text("affected_services"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const incidentUpdatesTable = pgTable("incident_updates", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id").notNull().references(() => incidentsTable.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
