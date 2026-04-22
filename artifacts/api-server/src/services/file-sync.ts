export interface SyncState {
  id: string;
  containerId: string;
  projectId: string;
  status: "syncing" | "synced" | "conflict" | "error";
  direction: "bidirectional" | "ide-to-container" | "container-to-ide";
  lastSyncAt: Date | null;
  filesTracked: number;
  filesChanged: number;
  conflicts: SyncConflict[];
  ignoredPatterns: string[];
}

interface SyncConflict {
  file: string;
  ideVersion: string;
  containerVersion: string;
  detectedAt: Date;
  resolution: "pending" | "use-ide" | "use-container" | "merged";
}

class FileSyncService {
  private states: Map<string, SyncState> = new Map();

  create(containerId: string, projectId: string): SyncState {
    const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const state: SyncState = {
      id, containerId, projectId, status: "synced",
      direction: "bidirectional", lastSyncAt: new Date(),
      filesTracked: Math.floor(Math.random() * 200) + 50,
      filesChanged: 0, conflicts: [],
      ignoredPatterns: ["node_modules/**", ".git/**", "dist/**", "*.log"],
    };
    this.states.set(id, state);
    return state;
  }

  get(id: string): SyncState | null { return this.states.get(id) || null; }
  list(): SyncState[] { return Array.from(this.states.values()); }

  sync(id: string): SyncState | null {
    const state = this.states.get(id);
    if (!state) return null;
    state.status = "synced";
    state.lastSyncAt = new Date();
    state.filesChanged = Math.floor(Math.random() * 10);
    return state;
  }

  resolveConflict(id: string, file: string, resolution: "use-ide" | "use-container" | "merged"): boolean {
    const state = this.states.get(id);
    if (!state) return false;
    const conflict = state.conflicts.find(c => c.file === file);
    if (!conflict) return false;
    conflict.resolution = resolution;
    state.conflicts = state.conflicts.filter(c => c.resolution === "pending");
    if (state.conflicts.length === 0) state.status = "synced";
    return true;
  }

  updateIgnored(id: string, patterns: string[]): boolean {
    const state = this.states.get(id);
    if (!state) return false;
    state.ignoredPatterns = patterns;
    return true;
  }
}

export const fileSyncService = new FileSyncService();
