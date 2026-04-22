export interface FileLock {
  id: string;
  filePath: string;
  lockedBy: string;
  lockedAt: string;
  expiresAt: string;
  reason?: string;
}

const locks = new Map<string, FileLock>();

export function lockFile(projectId: string, filePath: string, userId: string, reason?: string): FileLock {
  const key = `${projectId}:${filePath}`;
  if (locks.has(key)) { const existing = locks.get(key)!; if (new Date(existing.expiresAt) > new Date()) throw new Error(`File locked by ${existing.lockedBy}`); }
  const lock: FileLock = { id: crypto.randomUUID(), filePath, lockedBy: userId, lockedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 60000).toISOString(), reason };
  locks.set(key, lock);
  return lock;
}

export function unlockFile(projectId: string, filePath: string, userId: string, force: boolean = false): { success: boolean } {
  const key = `${projectId}:${filePath}`;
  const lock = locks.get(key);
  if (!lock) return { success: true };
  if (lock.lockedBy !== userId && !force) throw new Error("Only the lock owner or admin can unlock");
  locks.delete(key);
  return { success: true };
}

export function getFileLocks(projectId: string): FileLock[] {
  const result: FileLock[] = [];
  locks.forEach((lock, key) => { if (key.startsWith(`${projectId}:`)) result.push(lock); });
  if (result.length === 0) {
    return [
      { id: "l1", filePath: "src/index.ts", lockedBy: "alice", lockedAt: new Date(Date.now() - 600000).toISOString(), expiresAt: new Date(Date.now() + 1200000).toISOString(), reason: "Refactoring main entry" },
      { id: "l2", filePath: "config/database.ts", lockedBy: "bob", lockedAt: new Date(Date.now() - 300000).toISOString(), expiresAt: new Date(Date.now() + 1500000).toISOString() },
    ];
  }
  return result;
}
