import { pgTable, uuid, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const usageMetricsTable = pgTable("usage_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  metric: varchar("metric", { length: 50 }).notNull(),
  value: integer("value").default(0).notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_usage_metrics_user").on(table.userId),
  index("idx_usage_metrics_period").on(table.userId, table.metric, table.periodStart),
]);

export const insertUsageMetricSchema = createInsertSchema(usageMetricsTable).omit({ id: true, createdAt: true });
export type InsertUsageMetric = z.infer<typeof insertUsageMetricSchema>;
export type UsageMetric = typeof usageMetricsTable.$inferSelect;
