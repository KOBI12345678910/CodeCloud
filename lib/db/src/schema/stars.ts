import { pgTable, uuid, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const starsTable = pgTable("stars", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("unique_star").on(table.userId, table.projectId),
  index("idx_stars_project").on(table.projectId),
]);

export const insertStarSchema = createInsertSchema(starsTable).omit({ id: true, createdAt: true });
export type InsertStar = z.infer<typeof insertStarSchema>;
export type Star = typeof starsTable.$inferSelect;
