import { EventEmitter } from "events";
import crypto from "crypto";

export type FileChangeType = "created" | "modified" | "deleted" | "renamed";
export type ChangeSource = "filesystem" | "editor" | "git" | "upload" | "api";
export type ConflictResolution = "local" | "remote" | "merge" | "skip";

export interface FileChange {
  id: string;
  projectId: string;
  filePath: string;
  changeType: FileChangeType;
  source: ChangeSource;
  oldPath?: string;
  contentHash?: string;
  sizeBytes?: number;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface FileConflict {
  id: string;
  projectId: string;
  filePath: string;
  localChange: FileChange;
  remoteChange: FileChange;
  detectedAt: number;
  resolved: boolean;
  resolution?: ConflictResolution;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface WatcherConfig {
  debounceMs: number;
  ignorePatterns: string[];
  maxBatchSize: number;
  conflictWindowMs: number;
  syncIntervalMs: number;
}

export interface WatcherState {
  projectId: string;
  active: boolean;
  startedAt: number;
  lastSyncAt: number;
  totalChanges: number;
  pendingChanges: number;
  conflicts: number;
  config: WatcherConfig;
}

interface ProjectWatcher {
  state: WatcherState;
  changeBuffer: FileChange[];
  flushTimer: ReturnType<typeof setTimeout> | null;
  syncTimer: ReturnType<typeof setInterval> | null;
  recentChanges: Map<string, FileChange>;
  conflicts: Map<string, FileConflict>;
  fileHashes: Map<string, string>;
}

const DEFAULT_CONFIG: WatcherConfig = {
  debounceMs: 300,
  ignorePatterns: [
    "node_modules/**",
    ".git/**",
    "*.log",
    ".DS_Store",
    "dist/**",
    "build/**",
    ".cache/**",
    "*.swp",
    "*.swo",
    "*~",
    ".env.local",
    "coverage/**",
    "__pycache__/**",
    "*.pyc",
  ],
  maxBatchSize: 100,
  conflictWindowMs: 5000,
  syncIntervalMs: 10000,
};

class FileWatcherService extends EventEmitter {
  private watchers = new Map<string, ProjectWatcher>();

  startWatching(projectId: string, config?: Partial<WatcherConfig>): WatcherState {
    if (this.watchers.has(projectId)) {
      return this.watchers.get(projectId)!.state;
    }

    const mergedConfig: WatcherConfig = { ...DEFAULT_CONFIG, ...config };

    const watcher: ProjectWatcher = {
      state: {
        projectId,
        active: true,
        startedAt: Date.now(),
        lastSyncAt: Date.now(),
        totalChanges: 0,
        pendingChanges: 0,
        conflicts: 0,
        config: mergedConfig,
      },
      changeBuffer: [],
      flushTimer: null,
      syncTimer: null,
      recentChanges: new Map(),
      conflicts: new Map(),
      fileHashes: new Map(),
    };

    watcher.syncTimer = setInterval(() => {
      this.performSync(projectId);
    }, mergedConfig.syncIntervalMs);

    this.watchers.set(projectId, watcher);
    this.emit("watcher:started", { projectId });

    return watcher.state;
  }

  stopWatching(projectId: string): boolean {
    const watcher = this.watchers.get(projectId);
    if (!watcher) return false;

    if (watcher.changeBuffer.length > 0) {
      this.flushChanges(projectId);
    }

    if (watcher.flushTimer) clearTimeout(watcher.flushTimer);
    if (watcher.syncTimer) clearInterval(watcher.syncTimer);

    watcher.state.active = false;
    this.watchers.delete(projectId);
    this.emit("watcher:stopped", { projectId });

    return true;
  }

  reportChange(change: Omit<FileChange, "id" | "timestamp">): FileChange | null {
    const watcher = this.watchers.get(change.projectId);
    if (!watcher || !watcher.state.active) return null;

    if (this.shouldIgnore(change.filePath, watcher.state.config.ignorePatterns)) {
      return null;
    }

    const fullChange: FileChange = {
      ...change,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const conflict = this.detectConflict(watcher, fullChange);
    if (conflict) {
      watcher.conflicts.set(conflict.id, conflict);
      watcher.state.conflicts++;
      this.emit("file:conflict", conflict);
    }

    watcher.recentChanges.set(fullChange.filePath, fullChange);

    if (fullChange.contentHash) {
      watcher.fileHashes.set(fullChange.filePath, fullChange.contentHash);
    }
    if (fullChange.changeType === "deleted") {
      watcher.fileHashes.delete(fullChange.filePath);
    }

    watcher.changeBuffer.push(fullChange);
    watcher.state.totalChanges++;
    watcher.state.pendingChanges = watcher.changeBuffer.length;

    if (watcher.changeBuffer.length >= watcher.state.config.maxBatchSize) {
      this.flushChanges(change.projectId);
    } else {
      this.scheduleFlush(change.projectId);
    }

    return fullChange;
  }

  private detectConflict(watcher: ProjectWatcher, change: FileChange): FileConflict | null {
    const recent = watcher.recentChanges.get(change.filePath);
    if (!recent) return null;
    if (recent.source === change.source) return null;
    if (change.timestamp - recent.timestamp > watcher.state.config.conflictWindowMs) return null;

    if (change.changeType === "modified" && recent.changeType === "modified") {
      if (change.contentHash && recent.contentHash && change.contentHash === recent.contentHash) {
        return null;
      }

      return {
        id: crypto.randomUUID(),
        projectId: change.projectId,
        filePath: change.filePath,
        localChange: recent,
        remoteChange: change,
        detectedAt: Date.now(),
        resolved: false,
      };
    }

    if (
      (change.changeType === "deleted" && recent.changeType === "modified") ||
      (change.changeType === "modified" && recent.changeType === "deleted")
    ) {
      return {
        id: crypto.randomUUID(),
        projectId: change.projectId,
        filePath: change.filePath,
        localChange: recent,
        remoteChange: change,
        detectedAt: Date.now(),
        resolved: false,
      };
    }

    return null;
  }

  resolveConflict(
    projectId: string,
    conflictId: string,
    resolution: ConflictResolution,
    resolvedBy?: string
  ): FileConflict | null {
    const watcher = this.watchers.get(projectId);
    if (!watcher) return null;

    const conflict = watcher.conflicts.get(conflictId);
    if (!conflict || conflict.resolved) return null;

    conflict.resolved = true;
    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();
    conflict.resolvedBy = resolvedBy;

    this.emit("conflict:resolved", conflict);
    return conflict;
  }

  private scheduleFlush(projectId: string): void {
    const watcher = this.watchers.get(projectId);
    if (!watcher || watcher.flushTimer) return;

    watcher.flushTimer = setTimeout(() => {
      this.flushChanges(projectId);
    }, watcher.state.config.debounceMs);
  }

  private flushChanges(projectId: string): void {
    const watcher = this.watchers.get(projectId);
    if (!watcher || watcher.changeBuffer.length === 0) return;

    if (watcher.flushTimer) {
      clearTimeout(watcher.flushTimer);
      watcher.flushTimer = null;
    }

    const batch = [...watcher.changeBuffer];
    watcher.changeBuffer = [];
    watcher.state.pendingChanges = 0;

    const deduplicated = this.deduplicateBatch(batch);

    this.emit("file:changes", {
      projectId,
      changes: deduplicated,
      batchId: crypto.randomUUID(),
      timestamp: Date.now(),
    });
  }

  private deduplicateBatch(changes: FileChange[]): FileChange[] {
    const byPath = new Map<string, FileChange>();

    for (const change of changes) {
      const key = change.filePath;
      const existing = byPath.get(key);

      if (!existing) {
        byPath.set(key, change);
        continue;
      }

      if (existing.changeType === "created" && change.changeType === "deleted") {
        byPath.delete(key);
        continue;
      }

      if (existing.changeType === "created" && change.changeType === "modified") {
        byPath.set(key, { ...change, changeType: "created" });
        continue;
      }

      byPath.set(key, change);
    }

    return Array.from(byPath.values());
  }

  private performSync(projectId: string): void {
    const watcher = this.watchers.get(projectId);
    if (!watcher || !watcher.state.active) return;

    watcher.state.lastSyncAt = Date.now();

    this.emit("watcher:sync", {
      projectId,
      timestamp: Date.now(),
      fileCount: watcher.fileHashes.size,
      pendingConflicts: Array.from(watcher.conflicts.values()).filter((c) => !c.resolved).length,
    });
  }

  private shouldIgnore(filePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (this.matchGlob(filePath, pattern)) return true;
    }
    return false;
  }

  private matchGlob(filePath: string, pattern: string): boolean {
    const regexStr = pattern
      .replace(/\./g, "\\.")
      .replace(/\*\*/g, "___GLOBSTAR___")
      .replace(/\*/g, "[^/]*")
      .replace(/___GLOBSTAR___/g, ".*")
      .replace(/\?/g, "[^/]");

    return new RegExp(`^${regexStr}$`).test(filePath) ||
      new RegExp(`(^|/)${regexStr}$`).test(filePath);
  }

  getWatcherState(projectId: string): WatcherState | null {
    return this.watchers.get(projectId)?.state ?? null;
  }

  getConflicts(projectId: string, includeResolved = false): FileConflict[] {
    const watcher = this.watchers.get(projectId);
    if (!watcher) return [];

    const conflicts = Array.from(watcher.conflicts.values());
    return includeResolved ? conflicts : conflicts.filter((c) => !c.resolved);
  }

  getRecentChanges(projectId: string, limit = 50): FileChange[] {
    const watcher = this.watchers.get(projectId);
    if (!watcher) return [];

    return Array.from(watcher.recentChanges.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getFileHash(projectId: string, filePath: string): string | null {
    return this.watchers.get(projectId)?.fileHashes.get(filePath) ?? null;
  }

  updateConfig(projectId: string, config: Partial<WatcherConfig>): WatcherConfig | null {
    const watcher = this.watchers.get(projectId);
    if (!watcher) return null;

    Object.assign(watcher.state.config, config);

    if (config.syncIntervalMs && watcher.syncTimer) {
      clearInterval(watcher.syncTimer);
      watcher.syncTimer = setInterval(() => {
        this.performSync(projectId);
      }, watcher.state.config.syncIntervalMs);
    }

    return watcher.state.config;
  }

  computeContentHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
  }

  getActiveWatchers(): WatcherState[] {
    return Array.from(this.watchers.values()).map((w) => w.state);
  }

  shutdown(): void {
    for (const [projectId] of this.watchers) {
      this.stopWatching(projectId);
    }
  }
}

export const fileWatcher = new FileWatcherService();
