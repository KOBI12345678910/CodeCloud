import { db, filesTable, agentCheckpointsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface SnapshotEntry {
  path: string;
  isDirectory: boolean;
  content: string | null;
}

export async function captureProjectSnapshot(projectId: string): Promise<SnapshotEntry[]> {
  const files = await db.select({
    path: filesTable.path,
    isDirectory: filesTable.isDirectory,
    content: filesTable.content,
  }).from(filesTable).where(eq(filesTable.projectId, projectId));
  return files.map((f) => ({ path: f.path, isDirectory: f.isDirectory, content: f.content }));
}

export async function createCheckpoint(taskId: string, projectId: string, label: string, isFinal = false): Promise<string> {
  const snapshot = await captureProjectSnapshot(projectId);
  const [row] = await db.insert(agentCheckpointsTable).values({
    taskId, projectId, label, fileSnapshot: snapshot, fileCount: snapshot.length, isFinal,
  }).returning({ id: agentCheckpointsTable.id });
  return row.id;
}

export async function rollbackToCheckpoint(checkpointId: string): Promise<{ projectId: string; restored: number }> {
  const [cp] = await db.select().from(agentCheckpointsTable).where(eq(agentCheckpointsTable.id, checkpointId));
  if (!cp) throw new Error("Checkpoint not found");
  const snapshot = (cp.fileSnapshot as SnapshotEntry[]) ?? [];

  await db.delete(filesTable).where(eq(filesTable.projectId, cp.projectId));

  if (snapshot.length > 0) {
    const directories = snapshot.filter((e) => e.isDirectory);
    const files = snapshot.filter((e) => !e.isDirectory);
    const all = [...directories, ...files];
    for (const e of all) {
      const name = e.path.split("/").pop() || e.path;
      await db.insert(filesTable).values({
        projectId: cp.projectId,
        path: e.path,
        name,
        isDirectory: e.isDirectory,
        content: e.content,
        sizeBytes: e.content ? Buffer.byteLength(e.content, "utf8") : 0,
      }).onConflictDoNothing();
    }
  }
  return { projectId: cp.projectId, restored: snapshot.length };
}

export function diffSnapshots(a: SnapshotEntry[], b: SnapshotEntry[]): { path: string; status: "added" | "removed" | "modified" }[] {
  const aMap = new Map(a.filter((e) => !e.isDirectory).map((e) => [e.path, e.content ?? ""]));
  const bMap = new Map(b.filter((e) => !e.isDirectory).map((e) => [e.path, e.content ?? ""]));
  const out: { path: string; status: "added" | "removed" | "modified" }[] = [];
  for (const [path, content] of bMap) {
    if (!aMap.has(path)) out.push({ path, status: "added" });
    else if (aMap.get(path) !== content) out.push({ path, status: "modified" });
  }
  for (const path of aMap.keys()) {
    if (!bMap.has(path)) out.push({ path, status: "removed" });
  }
  return out.sort((x, y) => x.path.localeCompare(y.path));
}
