import { db, snapshotsTable, filesTable, projectSecretsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import type { Snapshot } from "@workspace/db";

export async function createSnapshot(
  projectId: string,
  name: string,
  trigger: "manual" | "auto" | "pre_deploy" | "scheduled",
  createdBy?: string,
  description?: string
): Promise<Snapshot> {
  const files = await db.select({
    path: filesTable.path,
    name: filesTable.name,
    content: filesTable.content,
    isDirectory: filesTable.isDirectory,
    mimeType: filesTable.mimeType,
  }).from(filesTable).where(eq(filesTable.projectId, projectId));

  const secrets = await db.select({
    key: projectSecretsTable.key,
    encryptedValue: projectSecretsTable.encryptedValue,
  }).from(projectSecretsTable).where(eq(projectSecretsTable.projectId, projectId));

  const fileSnapshot = files.map(f => ({
    path: f.path,
    name: f.name,
    content: f.content,
    isDirectory: f.isDirectory,
    mimeType: f.mimeType,
  }));

  const envSnapshot = secrets.map(s => ({ key: s.key, encryptedValue: s.encryptedValue }));

  let totalSize = 0;
  for (const f of files) {
    totalSize += (f.content || "").length;
  }

  const now = new Date();
  const expiresAt = trigger === "auto" || trigger === "scheduled"
    ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;

  const [snapshot] = await db.insert(snapshotsTable).values({
    projectId,
    name,
    description,
    trigger,
    fileSnapshot,
    envSnapshot,
    containerConfig: { nodeVersion: "18", memory: "512MB" },
    sizeBytes: totalSize,
    fileCount: files.length,
    isAutomatic: trigger !== "manual",
    createdBy,
    status: "ready",
    completedAt: now,
    expiresAt,
  }).returning();

  console.log(`[snapshots] Created snapshot "${name}" for project ${projectId} (${files.length} files, ${Math.round(totalSize / 1024)}KB)`);
  return snapshot;
}

export async function restoreSnapshot(snapshotId: string): Promise<Snapshot> {
  const [snapshot] = await db.select().from(snapshotsTable)
    .where(eq(snapshotsTable.id, snapshotId)).limit(1);
  if (!snapshot) throw new Error("Snapshot not found");
  if (snapshot.status !== "ready") throw new Error(`Cannot restore snapshot in ${snapshot.status} state`);

  await db.update(snapshotsTable)
    .set({ status: "restoring" })
    .where(eq(snapshotsTable.id, snapshotId));

  try {
    const files = (snapshot.fileSnapshot as any[]) || [];

    await db.delete(filesTable).where(eq(filesTable.projectId, snapshot.projectId));

    for (const file of files) {
      await db.insert(filesTable).values({
        projectId: snapshot.projectId,
        path: file.path,
        name: file.name,
        content: file.content || "",
        isDirectory: file.isDirectory || false,
      });
    }

    if (snapshot.envSnapshot) {
      const envVars = snapshot.envSnapshot as any[];
      await db.delete(projectSecretsTable).where(eq(projectSecretsTable.projectId, snapshot.projectId));
      for (const env of envVars) {
        await db.insert(projectSecretsTable).values({
          projectId: snapshot.projectId,
          key: env.key,
          encryptedValue: env.encryptedValue || "",
        });
      }
    }

    const [restored] = await db.update(snapshotsTable)
      .set({ status: "ready" })
      .where(eq(snapshotsTable.id, snapshotId))
      .returning();

    const [newSnapshot] = await db.insert(snapshotsTable).values({
      projectId: snapshot.projectId,
      name: `Restored from "${snapshot.name}"`,
      description: `Restored from snapshot ${snapshot.id}`,
      trigger: "manual",
      fileSnapshot: snapshot.fileSnapshot,
      envSnapshot: snapshot.envSnapshot,
      containerConfig: snapshot.containerConfig,
      sizeBytes: snapshot.sizeBytes,
      fileCount: snapshot.fileCount,
      isAutomatic: false,
      restoredFromId: snapshot.id,
      createdBy: snapshot.createdBy,
      status: "ready",
      completedAt: new Date(),
    }).returning();

    console.log(`[snapshots] Restored snapshot "${snapshot.name}" for project ${snapshot.projectId}`);
    return newSnapshot;
  } catch (err: any) {
    await db.update(snapshotsTable)
      .set({ status: "failed" })
      .where(eq(snapshotsTable.id, snapshotId));
    throw err;
  }
}

export async function getProjectSnapshots(projectId: string, limit = 20): Promise<Omit<Snapshot, "fileSnapshot" | "envSnapshot">[]> {
  const rows = await db.select({
    id: snapshotsTable.id,
    projectId: snapshotsTable.projectId,
    name: snapshotsTable.name,
    description: snapshotsTable.description,
    status: snapshotsTable.status,
    trigger: snapshotsTable.trigger,
    containerConfig: snapshotsTable.containerConfig,
    sizeBytes: snapshotsTable.sizeBytes,
    fileCount: snapshotsTable.fileCount,
    restoredFromId: snapshotsTable.restoredFromId,
    isAutomatic: snapshotsTable.isAutomatic,
    createdBy: snapshotsTable.createdBy,
    createdAt: snapshotsTable.createdAt,
    completedAt: snapshotsTable.completedAt,
    expiresAt: snapshotsTable.expiresAt,
  }).from(snapshotsTable)
    .where(eq(snapshotsTable.projectId, projectId))
    .orderBy(desc(snapshotsTable.createdAt))
    .limit(limit);

  return rows;
}

export async function getSnapshot(snapshotId: string): Promise<Snapshot | null> {
  const [snap] = await db.select().from(snapshotsTable)
    .where(eq(snapshotsTable.id, snapshotId)).limit(1);
  return snap || null;
}

export async function deleteSnapshot(snapshotId: string): Promise<void> {
  await db.update(snapshotsTable)
    .set({ status: "deleted" })
    .where(eq(snapshotsTable.id, snapshotId));
}

export async function getSnapshotFiles(snapshotId: string): Promise<any[]> {
  const [snap] = await db.select({ fileSnapshot: snapshotsTable.fileSnapshot })
    .from(snapshotsTable)
    .where(eq(snapshotsTable.id, snapshotId)).limit(1);
  if (!snap) throw new Error("Snapshot not found");
  return (snap.fileSnapshot as any[]) || [];
}

export async function compareSnapshots(fromId: string, toId: string) {
  const [fromSnap, toSnap] = await Promise.all([
    getSnapshot(fromId),
    getSnapshot(toId),
  ]);
  if (!fromSnap || !toSnap) throw new Error("One or both snapshots not found");

  const fromFiles = new Map((fromSnap.fileSnapshot as any[] || []).map(f => [f.path, f]));
  const toFiles = new Map((toSnap.fileSnapshot as any[] || []).map(f => [f.path, f]));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const [path] of toFiles) {
    if (!fromFiles.has(path)) added.push(path);
    else if (fromFiles.get(path)?.content !== toFiles.get(path)?.content) modified.push(path);
  }
  for (const [path] of fromFiles) {
    if (!toFiles.has(path)) removed.push(path);
  }

  return {
    from: { id: fromSnap.id, name: fromSnap.name, createdAt: fromSnap.createdAt },
    to: { id: toSnap.id, name: toSnap.name, createdAt: toSnap.createdAt },
    added, removed, modified,
    summary: { added: added.length, removed: removed.length, modified: modified.length },
  };
}

export async function getSnapshotCount(projectId: string): Promise<number> {
  const [result] = await db.select({ total: count() })
    .from(snapshotsTable)
    .where(and(eq(snapshotsTable.projectId, projectId), eq(snapshotsTable.status, "ready")));
  return result?.total || 0;
}

export async function cleanupExpiredSnapshots(): Promise<number> {
  const now = new Date();
  const expired = await db.select({ id: snapshotsTable.id })
    .from(snapshotsTable)
    .where(and(
      eq(snapshotsTable.status, "ready"),
    ));

  let cleaned = 0;
  for (const snap of expired) {
    const [s] = await db.select({ expiresAt: snapshotsTable.expiresAt })
      .from(snapshotsTable).where(eq(snapshotsTable.id, snap.id)).limit(1);
    if (s?.expiresAt && s.expiresAt < now) {
      await db.update(snapshotsTable)
        .set({ status: "deleted", fileSnapshot: null, envSnapshot: null })
        .where(eq(snapshotsTable.id, snap.id));
      cleaned++;
    }
  }

  return cleaned;
}
