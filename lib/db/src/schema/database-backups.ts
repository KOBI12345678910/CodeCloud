import { pgTable, uuid, varchar, integer, timestamp, pgEnum, index, text, boolean } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const backupStatusEnum = pgEnum("backup_status", ["pending", "running", "completed", "failed", "restoring"]);
export const backupTypeEnum = pgEnum("backup_type", ["scheduled", "manual", "pre_deploy", "pre_migration"]);

export const databaseBackupsTable = pgTable("database_backups", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").references(() => usersTable.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: backupTypeEnum("type").notNull().default("manual"),
  status: backupStatusEnum("status").notNull().default("pending"),
  sizeMb: integer("size_mb"),
  snapshotPath: varchar("snapshot_path", { length: 500 }),
  retentionDays: integer("retention_days").notNull().default(30),
  errorMessage: text("error_message"),
  isAutomatic: boolean("is_automatic").notNull().default(false),
  restoredAt: timestamp("restored_at", { withTimezone: true }),
  restoredBy: uuid("restored_by").references(() => usersTable.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_db_backups_project").on(table.projectId),
  index("idx_db_backups_status").on(table.status),
  index("idx_db_backups_expires").on(table.expiresAt),
]);

export type DatabaseBackup = typeof databaseBackupsTable.$inferSelect;
export type InsertDatabaseBackup = typeof databaseBackupsTable.$inferInsert;
