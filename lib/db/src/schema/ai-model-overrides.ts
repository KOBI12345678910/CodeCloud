import { pgTable, text, uuid, varchar, timestamp, integer, jsonb, real, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const aiModelOverridesTable = pgTable("ai_model_overrides", {
  modelId: varchar("model_id", { length: 64 }).primaryKey(),
  enabled: boolean("enabled"),
  inputPer1k: real("input_per_1k"),
  outputPer1k: real("output_per_1k"),
  qualityScore: integer("quality_score"),
  fallbackChain: jsonb("fallback_chain"),
  updatedBy: uuid("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const aiRegistryAuditTable = pgTable("ai_registry_audit", {
  id: uuid("id").defaultRandom().primaryKey(),
  modelId: varchar("model_id", { length: 64 }).notNull(),
  actorId: uuid("actor_id").references(() => usersTable.id, { onDelete: "set null" }),
  patch: jsonb("patch").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  version: integer("version").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
