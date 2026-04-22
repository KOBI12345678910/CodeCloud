export interface FsSnapshot {
  id: string;
  projectId: string;
  containerId: string;
  label: string;
  createdAt: string;
  totalFiles: number;
  totalSize: number;
  files: FsEntry[];
}

export interface FsEntry {
  path: string;
  size: number;
  modified: string;
  hash: string;
  type: "file" | "directory" | "symlink";
  permissions: string;
}

export interface FsDiffResult {
  snapshotA: { id: string; label: string; createdAt: string };
  snapshotB: { id: string; label: string; createdAt: string };
  added: FsEntry[];
  modified: { path: string; before: FsEntry; after: FsEntry; sizeDelta: number }[];
  deleted: FsEntry[];
  unchanged: number;
  summary: { totalChanges: number; addedCount: number; modifiedCount: number; deletedCount: number; sizeDelta: number };
}

const SAMPLE_PATHS = [
  "src/index.ts", "src/app.ts", "src/server.ts", "src/config.ts",
  "src/routes/api.ts", "src/routes/auth.ts", "src/routes/users.ts",
  "src/middleware/cors.ts", "src/middleware/auth.ts", "src/middleware/logger.ts",
  "src/models/user.ts", "src/models/project.ts", "src/models/session.ts",
  "src/utils/helpers.ts", "src/utils/crypto.ts", "src/utils/validators.ts",
  "package.json", "tsconfig.json", ".env", ".gitignore", "Dockerfile",
  "docker-compose.yml", "README.md", "LICENSE", "jest.config.ts",
  "src/types/index.d.ts", "src/types/express.d.ts",
  "public/index.html", "public/favicon.ico", "public/manifest.json",
  "tests/api.test.ts", "tests/auth.test.ts", "tests/setup.ts",
];

function randomHash(): string {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function generateSnapshot(projectId: string, containerId: string, label: string, timeOffset: number): FsSnapshot {
  const now = Date.now();
  const count = 20 + Math.floor(Math.random() * 15);
  const selected = SAMPLE_PATHS.slice(0, count);

  const files: FsEntry[] = selected.map(path => ({
    path,
    size: Math.floor(Math.random() * 50000) + 100,
    modified: new Date(now - timeOffset - Math.floor(Math.random() * 86400000)).toISOString(),
    hash: randomHash(),
    type: "file" as const,
    permissions: path.endsWith(".ts") || path.endsWith(".js") ? "0644" : "0644",
  }));

  return {
    id: crypto.randomUUID(),
    projectId,
    containerId,
    label,
    createdAt: new Date(now - timeOffset).toISOString(),
    totalFiles: files.length,
    totalSize: files.reduce((s, f) => s + f.size, 0),
    files,
  };
}

const snapshotCache = new Map<string, FsSnapshot[]>();

export function listSnapshots(projectId: string, containerId: string): FsSnapshot[] {
  const key = `${projectId}:${containerId}`;
  if (!snapshotCache.has(key)) {
    snapshotCache.set(key, [
      generateSnapshot(projectId, containerId, "Initial deploy", 7 * 86400000),
      generateSnapshot(projectId, containerId, "Added auth module", 3 * 86400000),
      generateSnapshot(projectId, containerId, "Database migration", 1 * 86400000),
      generateSnapshot(projectId, containerId, "Bug fix release", 6 * 3600000),
      generateSnapshot(projectId, containerId, "Current state", 0),
    ]);
  }
  return snapshotCache.get(key)!;
}

export function createSnapshot(projectId: string, containerId: string, label: string): FsSnapshot {
  const key = `${projectId}:${containerId}`;
  const snapshots = listSnapshots(projectId, containerId);
  const snap = generateSnapshot(projectId, containerId, label, 0);
  snapshots.push(snap);
  snapshotCache.set(key, snapshots);
  return snap;
}

export function diffSnapshots(projectId: string, containerId: string, snapshotAId: string, snapshotBId: string): FsDiffResult {
  const snapshots = listSnapshots(projectId, containerId);
  const a = snapshots.find(s => s.id === snapshotAId);
  const b = snapshots.find(s => s.id === snapshotBId);
  if (!a || !b) throw new Error("Snapshot not found");

  const aMap = new Map(a.files.map(f => [f.path, f]));
  const bMap = new Map(b.files.map(f => [f.path, f]));

  const added: FsEntry[] = [];
  const modified: FsDiffResult["modified"] = [];
  const deleted: FsEntry[] = [];
  let unchanged = 0;

  for (const [path, entry] of bMap) {
    const prev = aMap.get(path);
    if (!prev) {
      added.push(entry);
    } else if (prev.hash !== entry.hash) {
      modified.push({ path, before: prev, after: entry, sizeDelta: entry.size - prev.size });
    } else {
      unchanged++;
    }
  }

  for (const [path, entry] of aMap) {
    if (!bMap.has(path)) deleted.push(entry);
  }

  const sizeDelta = added.reduce((s, f) => s + f.size, 0)
    + modified.reduce((s, m) => s + m.sizeDelta, 0)
    - deleted.reduce((s, f) => s + f.size, 0);

  return {
    snapshotA: { id: a.id, label: a.label, createdAt: a.createdAt },
    snapshotB: { id: b.id, label: b.label, createdAt: b.createdAt },
    added,
    modified,
    deleted,
    unchanged,
    summary: {
      totalChanges: added.length + modified.length + deleted.length,
      addedCount: added.length,
      modifiedCount: modified.length,
      deletedCount: deleted.length,
      sizeDelta,
    },
  };
}

export function restoreFile(projectId: string, containerId: string, snapshotId: string, filePath: string): { success: boolean; restored: string; from: string } {
  const snapshots = listSnapshots(projectId, containerId);
  const snap = snapshots.find(s => s.id === snapshotId);
  if (!snap) throw new Error("Snapshot not found");
  const file = snap.files.find(f => f.path === filePath);
  if (!file) throw new Error("File not found in snapshot");
  return { success: true, restored: filePath, from: snap.label };
}
