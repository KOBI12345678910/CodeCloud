import { pgTable, text, uuid, varchar, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const logStreamEnum = pgEnum("log_stream", ["stdout", "stderr", "system"]);

export const containerLogsTable = pgTable("container_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  containerId: varchar("container_id", { length: 255 }),
  stream: logStreamEnum("stream").default("stdout").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_container_logs_project").on(table.projectId),
  index("idx_container_logs_timestamp").on(table.timestamp),
  index("idx_container_logs_project_timestamp").on(table.projectId, table.timestamp),
]);

export const insertContainerLogSchema = createInsertSchema(containerLogsTable).omit({ id: true, timestamp: true });
export type InsertContainerLog = z.infer<typeof insertContainerLogSchema>;
export type ContainerLog = typeof containerLogsTable.$inferSelect;
