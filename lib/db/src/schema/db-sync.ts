import { pgTable, uuid, varchar, timestamp, text, integer, jsonb } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const dbSyncLogsTable = pgTable("db_sync_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  tableName: varchar("table_name", { length: 255 }),
  recordCount: integer("record_count").default(0),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  backupUrl: text("backup_url"),
  restorePoint: timestamp("restore_point"),
  metadata: jsonb("metadata").default({}),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
