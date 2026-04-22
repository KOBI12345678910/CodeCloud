import { pgTable, uuid, varchar, timestamp, pgEnum, index, text, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const snapshotStatusEnum = pgEnum("snapshot_status", ["creating", "ready", "restoring", "failed", "deleted"]);
export const snapshotTriggerEnum = pgEnum("snapshot_trigger", ["manual", "auto", "pre_deploy", "scheduled"]);

export const snapshotsTable = pgTable("snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: snapshotStatusEnum("snapshot_status").default("creating").notNull(),
  trigger: snapshotTriggerEnum("snapshot_trigger").default("manual").notNull(),
  fileSnapshot: jsonb("file_snapshot"),
  envSnapshot: jsonb("env_snapshot"),
  containerConfig: jsonb("container_config"),
  sizeBytes: integer("size_bytes").default(0),
  fileCount: integer("file_count").default(0),
  restoredFromId: uuid("restored_from_id"),
  isAutomatic: boolean("is_automatic").default(false).notNull(),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (table) => [
  index("idx_snapshots_project").on(table.projectId),
  index("idx_snapshots_status").on(table.status),
  index("idx_snapshots_trigger").on(table.trigger),
  index("idx_snapshots_created").on(table.createdAt),
]);

export const insertSnapshotSchema = createInsertSchema(snapshotsTable).omit({ id: true, createdAt: true });
export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type Snapshot = typeof snapshotsTable.$inferSelect;
