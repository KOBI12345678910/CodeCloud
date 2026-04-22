export interface RuntimeState {
  containerId: string;
  modules: { name: string; version: string; loaded: boolean }[];
  fileDescriptors: { fd: number; path: string; type: string }[];
  threads: { id: number; name: string; state: string; cpuPercent: number }[];
  eventLoop: { pending: number; active: number; avgLatencyMs: number; maxLatencyMs: number };
  uptime: number;
  pid: number;
  inspectedAt: Date;
}

class RuntimeInspectService {
  inspect(containerId: string): RuntimeState {
    return {
      containerId,
      modules: [
        { name: "express", version: "5.0.0", loaded: true },
        { name: "typescript", version: "5.6.0", loaded: true },
        { name: "pg", version: "8.12.0", loaded: true },
        { name: "redis", version: "4.7.0", loaded: false },
        { name: "ws", version: "8.18.0", loaded: true },
      ],
      fileDescriptors: [
        { fd: 0, path: "/dev/stdin", type: "character" },
        { fd: 1, path: "/dev/stdout", type: "character" },
        { fd: 2, path: "/dev/stderr", type: "character" },
        { fd: 3, path: "/var/log/app.log", type: "file" },
        { fd: 4, path: "socket:[12345]", type: "socket" },
        { fd: 5, path: "pipe:[67890]", type: "pipe" },
      ],
      threads: [
        { id: 1, name: "main", state: "running", cpuPercent: 12.5 },
        { id: 2, name: "worker-1", state: "idle", cpuPercent: 0.2 },
        { id: 3, name: "worker-2", state: "waiting", cpuPercent: 3.1 },
        { id: 4, name: "gc", state: "idle", cpuPercent: 0.0 },
      ],
      eventLoop: {
        pending: Math.floor(Math.random() * 20),
        active: Math.floor(Math.random() * 5) + 1,
        avgLatencyMs: Math.random() * 5 + 0.1,
        maxLatencyMs: Math.random() * 50 + 5,
      },
      uptime: Math.floor(Math.random() * 86400) + 3600,
      pid: Math.floor(Math.random() * 30000) + 1000,
      inspectedAt: new Date(),
    };
  }
}

export const runtimeInspectService = new RuntimeInspectService();
