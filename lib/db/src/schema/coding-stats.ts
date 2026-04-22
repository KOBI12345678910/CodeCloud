import { pgTable, uuid, varchar, timestamp, integer, date } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const codingStatsTable = pgTable("coding_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  language: varchar("language", { length: 50 }),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  keystrokes: integer("keystrokes").notNull().default(0),
  linesAdded: integer("lines_added").notNull().default(0),
  linesDeleted: integer("lines_deleted").notNull().default(0),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const codingStreaksTable = pgTable("coding_streaks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: date("last_active_date"),
  totalCodingSeconds: integer("total_coding_seconds").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
