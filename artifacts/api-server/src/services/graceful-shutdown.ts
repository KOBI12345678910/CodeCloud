import { EventEmitter } from "events";

export interface ShutdownConfig {
  timeoutMs: number;
  drainConnectionsMs: number;
  saveState: boolean;
  cleanupTempFiles: boolean;
  forceKillAfterMs: number;
  hooks: ShutdownHook[];
}

export interface ShutdownHook {
  name: string;
  priority: number;
  handler: () => Promise<void>;
  timeoutMs: number;
}

export interface ShutdownStatus {
  phase: "running" | "draining" | "completing" | "saving" | "cleanup" | "done" | "forced";
  startedAt: string | null;
  completedAt: string | null;
  activeConnections: number;
  pendingRequests: number;
  hooksExecuted: string[];
  hooksFailed: string[];
  elapsedMs: number;
  config: ShutdownConfig;
}

const DEFAULT_CONFIG: ShutdownConfig = {
  timeoutMs: 30000,
  drainConnectionsMs: 5000,
  saveState: true,
  cleanupTempFiles: true,
  forceKillAfterMs: 45000,
  hooks: [
    { name: "close-db-pool", priority: 10, handler: async () => {}, timeoutMs: 5000 },
    { name: "flush-logs", priority: 20, handler: async () => {}, timeoutMs: 3000 },
    { name: "deregister-service", priority: 5, handler: async () => {}, timeoutMs: 2000 },
    { name: "close-websockets", priority: 15, handler: async () => {}, timeoutMs: 5000 },
    { name: "save-session-state", priority: 25, handler: async () => {}, timeoutMs: 10000 },
  ],
};

export class GracefulShutdownService extends EventEmitter {
  private configs: Map<string, ShutdownConfig> = new Map();
  private statuses: Map<string, ShutdownStatus> = new Map();

  getConfig(containerId: string): ShutdownConfig {
    return this.configs.get(containerId) || { ...DEFAULT_CONFIG };
  }

  setConfig(containerId: string, config: Partial<ShutdownConfig>): ShutdownConfig {
    const existing = this.getConfig(containerId);
    const updated = { ...existing, ...config };
    this.configs.set(containerId, updated);
    return updated;
  }

  getStatus(containerId: string): ShutdownStatus {
    return this.statuses.get(containerId) || {
      phase: "running", startedAt: null, completedAt: null,
      activeConnections: Math.floor(Math.random() * 50) + 5,
      pendingRequests: Math.floor(Math.random() * 20),
      hooksExecuted: [], hooksFailed: [], elapsedMs: 0,
      config: this.getConfig(containerId),
    };
  }

  async initiateShutdown(containerId: string): Promise<ShutdownStatus> {
    const config = this.getConfig(containerId);
    const status: ShutdownStatus = {
      phase: "draining", startedAt: new Date().toISOString(), completedAt: null,
      activeConnections: Math.floor(Math.random() * 30) + 5,
      pendingRequests: Math.floor(Math.random() * 15),
      hooksExecuted: [], hooksFailed: [], elapsedMs: 0, config,
    };
    this.statuses.set(containerId, status);
    this.emit("shutdown:started", { containerId, status });

    const sortedHooks = [...config.hooks].sort((a, b) => a.priority - b.priority);
    for (const hook of sortedHooks) {
      try {
        await Promise.race([
          hook.handler(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), hook.timeoutMs)),
        ]);
        status.hooksExecuted.push(hook.name);
      } catch {
        status.hooksFailed.push(hook.name);
      }
    }

    status.phase = "completing";
    status.pendingRequests = Math.max(0, status.pendingRequests - Math.floor(Math.random() * 10));
    status.elapsedMs = Math.floor(Math.random() * 5000) + 2000;

    if (config.saveState) {
      status.phase = "saving";
      status.elapsedMs += Math.floor(Math.random() * 2000) + 500;
    }

    if (config.cleanupTempFiles) {
      status.phase = "cleanup";
      status.elapsedMs += Math.floor(Math.random() * 1000) + 200;
    }

    status.phase = "done";
    status.completedAt = new Date().toISOString();
    status.activeConnections = 0;
    status.pendingRequests = 0;
    this.statuses.set(containerId, status);
    this.emit("shutdown:completed", { containerId, status });

    return status;
  }

  async forceShutdown(containerId: string): Promise<ShutdownStatus> {
    const status = this.getStatus(containerId);
    status.phase = "forced";
    status.completedAt = new Date().toISOString();
    status.activeConnections = 0;
    status.pendingRequests = 0;
    this.statuses.set(containerId, status);
    this.emit("shutdown:forced", { containerId, status });
    return status;
  }

  addHook(containerId: string, hook: Omit<ShutdownHook, "handler"> & { handler?: () => Promise<void> }): ShutdownConfig {
    const config = this.getConfig(containerId);
    config.hooks.push({ ...hook, handler: hook.handler || (async () => {}) });
    this.configs.set(containerId, config);
    return config;
  }

  removeHook(containerId: string, hookName: string): ShutdownConfig {
    const config = this.getConfig(containerId);
    config.hooks = config.hooks.filter(h => h.name !== hookName);
    this.configs.set(containerId, config);
    return config;
  }
}

export const gracefulShutdownService = new GracefulShutdownService();
