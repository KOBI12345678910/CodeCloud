export interface ProjectSnapshot {
  id: string;
  projectId: string;
  name: string;
  description: string;
  files: { path: string; content: string; size: number }[];
  metadata: { fileCount: number; totalSize: number; language: string };
  createdBy: string;
  createdAt: Date;
}

class ProjectSnapshotsService {
  private snapshots: Map<string, ProjectSnapshot> = new Map();

  create(data: { projectId: string; name: string; description: string; files: { path: string; content: string }[]; createdBy: string }): ProjectSnapshot {
    const id = `psnap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const files = data.files.map(f => ({ ...f, size: f.content.length }));
    const snapshot: ProjectSnapshot = {
      id, projectId: data.projectId, name: data.name, description: data.description, files,
      metadata: { fileCount: files.length, totalSize: files.reduce((s, f) => s + f.size, 0), language: "typescript" },
      createdBy: data.createdBy, createdAt: new Date(),
    };
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  get(id: string): ProjectSnapshot | null { return this.snapshots.get(id) || null; }
  list(projectId: string): ProjectSnapshot[] { return Array.from(this.snapshots.values()).filter(s => s.projectId === projectId).reverse(); }
  delete(id: string): boolean { return this.snapshots.delete(id); }

  restore(id: string): { files: { path: string; content: string }[] } | null {
    const snap = this.snapshots.get(id); if (!snap) return null;
    return { files: snap.files.map(f => ({ path: f.path, content: f.content })) };
  }
}

export const projectSnapshotsService = new ProjectSnapshotsService();
