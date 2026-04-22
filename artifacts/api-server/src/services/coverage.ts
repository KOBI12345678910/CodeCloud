import { db } from "@workspace/db";
import { coverageReportsTable, type FileCoverageEntry } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function createCoverageReport(
  projectId: string,
  userId: string,
  command: string
) {
  const [report] = await db.insert(coverageReportsTable).values({
    projectId,
    userId,
    command,
    status: "pending",
  }).returning();
  return report;
}

export async function updateCoverageReport(
  reportId: string,
  data: {
    status?: string;
    totalFiles?: number;
    coveredFiles?: number;
    totalLines?: number;
    coveredLines?: number;
    totalBranches?: number;
    coveredBranches?: number;
    totalFunctions?: number;
    coveredFunctions?: number;
    overallPercentage?: number;
    fileCoverage?: FileCoverageEntry[];
    output?: string;
  }
) {
  const [updated] = await db.update(coverageReportsTable)
    .set(data)
    .where(eq(coverageReportsTable.id, reportId))
    .returning();
  return updated;
}

export async function completeCoverageReport(
  reportId: string,
  results: {
    totalFiles: number;
    coveredFiles: number;
    totalLines: number;
    coveredLines: number;
    totalBranches: number;
    coveredBranches: number;
    totalFunctions: number;
    coveredFunctions: number;
    overallPercentage: number;
    fileCoverage: FileCoverageEntry[];
    output: string;
  }
) {
  return updateCoverageReport(reportId, { ...results, status: "completed" });
}

export async function failCoverageReport(reportId: string, output: string) {
  return updateCoverageReport(reportId, { status: "failed", output });
}

export async function getCoverageReport(reportId: string) {
  const [report] = await db.select().from(coverageReportsTable)
    .where(eq(coverageReportsTable.id, reportId));
  return report || null;
}

export async function listCoverageReports(projectId: string, limit = 20) {
  return db.select().from(coverageReportsTable)
    .where(eq(coverageReportsTable.projectId, projectId))
    .orderBy(desc(coverageReportsTable.createdAt))
    .limit(limit);
}

export async function getLatestCoverage(projectId: string) {
  const [report] = await db.select().from(coverageReportsTable)
    .where(and(
      eq(coverageReportsTable.projectId, projectId),
      eq(coverageReportsTable.status, "completed")
    ))
    .orderBy(desc(coverageReportsTable.createdAt))
    .limit(1);
  return report || null;
}

export async function getFileCoverage(projectId: string, filePath: string) {
  const latest = await getLatestCoverage(projectId);
  if (!latest || !latest.fileCoverage) return null;
  const entries = latest.fileCoverage as FileCoverageEntry[];
  return entries.find(f => f.path === filePath) || null;
}

export async function deleteCoverageReport(reportId: string) {
  await db.delete(coverageReportsTable).where(eq(coverageReportsTable.id, reportId));
}
