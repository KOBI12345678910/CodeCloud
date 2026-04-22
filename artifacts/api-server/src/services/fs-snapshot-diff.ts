export interface FsSnapshot {
  id: string;
  containerId: string;
  files: { path: string; size: number; hash: string; modified: Date }[];
  createdAt: Date;
}

export interface FsDiff {
  snapshot1Id: string;
  snapshot2Id: string;
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: number;
}

class FsSnapshotDiffService {
  private snapshots: Map<string, FsSnapshot> = new Map();

  capture(containerId: string, files: { path: string; size: number; content: string }[]): FsSnapshot {
    const id = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const snapshot: FsSnapshot = {
      id, containerId, createdAt: new Date(),
      files: files.map(f => ({ path: f.path, size: f.size, hash: String(f.content.length), modified: new Date() })),
    };
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  get(id: string): FsSnapshot | null { return this.snapshots.get(id) || null; }
  list(containerId?: string): FsSnapshot[] {
    const all = Array.from(this.snapshots.values());
    return containerId ? all.filter(s => s.containerId === containerId) : all;
  }

  diff(id1: string, id2: string): FsDiff | null {
    const s1 = this.snapshots.get(id1);
    const s2 = this.snapshots.get(id2);
    if (!s1 || !s2) return null;
    const paths1 = new Map(s1.files.map(f => [f.path, f.hash]));
    const paths2 = new Map(s2.files.map(f => [f.path, f.hash]));
    const added = s2.files.filter(f => !paths1.has(f.path)).map(f => f.path);
    const removed = s1.files.filter(f => !paths2.has(f.path)).map(f => f.path);
    const modified = s2.files.filter(f => { const h1 = paths1.get(f.path); return h1 && h1 !== f.hash; }).map(f => f.path);
    const unchanged = s1.files.filter(f => paths2.get(f.path) === f.hash).length;
    return { snapshot1Id: id1, snapshot2Id: id2, added, removed, modified, unchanged };
  }

  delete(id: string): boolean { return this.snapshots.delete(id); }
}

export const fsSnapshotDiffService = new FsSnapshotDiffService();
