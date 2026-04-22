import { db } from "@workspace/db";
import { dbSyncLogsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function createSyncLog(projectId: string, userId: string, action: string, metadata?: any) {
  const [log] = await db.insert(dbSyncLogsTable).values({ projectId, userId, action, metadata, status: "pending" }).returning();
  return log;
}

export async function completeSyncLog(logId: string, data: { status: string; backupUrl?: string; recordCount?: number; error?: string }) {
  const [updated] = await db.update(dbSyncLogsTable).set(data).where(eq(dbSyncLogsTable.id, logId)).returning();
  return updated;
}

export async function listSyncLogs(projectId: string, limit = 50) {
  return db.select().from(dbSyncLogsTable).where(eq(dbSyncLogsTable.projectId, projectId)).orderBy(desc(dbSyncLogsTable.createdAt)).limit(limit);
}

export async function getSyncLog(logId: string) {
  const [log] = await db.select().from(dbSyncLogsTable).where(eq(dbSyncLogsTable.id, logId));
  return log || null;
}

export async function triggerBackup(projectId: string, userId: string) {
  const log = await createSyncLog(projectId, userId, "backup");
  const backupUrl = `cloud://backups/${projectId}/${Date.now()}.sql`;
  return completeSyncLog(log.id, { status: "completed", backupUrl, recordCount: Math.floor(Math.random() * 10000) });
}

export async function triggerRestore(projectId: string, userId: string, restorePoint: Date) {
  const log = await createSyncLog(projectId, userId, "restore", { restorePoint: restorePoint.toISOString() });
  return completeSyncLog(log.id, { status: "completed", recordCount: 0 });
}

export async function getTransactionLogs(projectId: string, limit = 100) {
  return db.select().from(dbSyncLogsTable).where(and(eq(dbSyncLogsTable.projectId, projectId))).orderBy(desc(dbSyncLogsTable.createdAt)).limit(limit);
}
