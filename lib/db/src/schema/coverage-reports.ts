import { pgTable, uuid, varchar, timestamp, integer, jsonb, text } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const coverageReportsTable = pgTable("coverage_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull(),
  command: text("command").notNull(),
  totalFiles: integer("total_files").notNull().default(0),
  coveredFiles: integer("covered_files").notNull().default(0),
  totalLines: integer("total_lines").notNull().default(0),
  coveredLines: integer("covered_lines").notNull().default(0),
  totalBranches: integer("total_branches").notNull().default(0),
  coveredBranches: integer("covered_branches").notNull().default(0),
  totalFunctions: integer("total_functions").notNull().default(0),
  coveredFunctions: integer("covered_functions").notNull().default(0),
  overallPercentage: integer("overall_percentage").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  fileCoverage: jsonb("file_coverage").$type<FileCoverageEntry[]>().default([]),
  output: text("output").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export interface FileCoverageEntry {
  path: string;
  lines: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  uncoveredLines: number[];
  coveredLines: number[];
}
