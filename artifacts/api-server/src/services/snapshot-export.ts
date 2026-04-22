export interface ContainerSnapshot {
  id: string;
  containerId: string;
  name: string;
  description: string;
  sizeMB: number;
  format: "tar.gz" | "oci";
  layers: string[];
  createdBy: string;
  shared: boolean;
  downloadUrl: string;
  createdAt: Date;
}

class SnapshotExportService {
  private snapshots: Map<string, ContainerSnapshot> = new Map();

  export(containerId: string, name: string, description: string, createdBy: string): ContainerSnapshot {
    const id = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const snapshot: ContainerSnapshot = {
      id, containerId, name, description,
      sizeMB: Math.floor(Math.random() * 500) + 50,
      format: "tar.gz",
      layers: ["base-os", "runtime", "deps", "app-code", "config"],
      createdBy, shared: false,
      downloadUrl: `/api/snapshots/${id}/download`,
      createdAt: new Date(),
    };
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  import(snapshotId: string, targetContainerId: string): { success: boolean; containerId: string } {
    const snap = this.snapshots.get(snapshotId);
    if (!snap) return { success: false, containerId: "" };
    return { success: true, containerId: targetContainerId };
  }

  get(id: string): ContainerSnapshot | null { return this.snapshots.get(id) || null; }
  list(): ContainerSnapshot[] { return Array.from(this.snapshots.values()); }

  share(id: string): boolean {
    const snap = this.snapshots.get(id);
    if (!snap) return false;
    snap.shared = true;
    return true;
  }

  delete(id: string): boolean { return this.snapshots.delete(id); }

  marketplace(): ContainerSnapshot[] {
    return Array.from(this.snapshots.values()).filter(s => s.shared);
  }
}

export const snapshotExportService = new SnapshotExportService();
