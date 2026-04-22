export interface Container {
  id: string;
  projectId: string;
  image: string;
  status: "creating" | "running" | "stopped" | "error";
  cpu: number;
  memory: number;
  ports: { internal: number; external: number }[];
  env: Record<string, string>;
  createdAt: Date;
  startedAt: Date | null;
}

class ContainerEngineService {
  private containers: Map<string, Container> = new Map();

  create(data: { projectId: string; image: string; cpu?: number; memory?: number; ports?: { internal: number; external: number }[]; env?: Record<string, string> }): Container {
    const id = `ctr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const container: Container = {
      id, projectId: data.projectId, image: data.image, status: "creating",
      cpu: data.cpu || 1, memory: data.memory || 512,
      ports: data.ports || [{ internal: 3000, external: 3000 }],
      env: data.env || {}, createdAt: new Date(), startedAt: null,
    };
    this.containers.set(id, container);
    return container;
  }

  start(id: string): Container | null { const c = this.containers.get(id); if (!c) return null; c.status = "running"; c.startedAt = new Date(); return c; }
  stop(id: string): Container | null { const c = this.containers.get(id); if (!c) return null; c.status = "stopped"; return c; }
  remove(id: string): boolean { return this.containers.delete(id); }
  get(id: string): Container | null { return this.containers.get(id) || null; }
  listByProject(projectId: string): Container[] { return Array.from(this.containers.values()).filter(c => c.projectId === projectId); }
  list(): Container[] { return Array.from(this.containers.values()); }

  exec(id: string, command: string): { stdout: string; stderr: string; exitCode: number } | null {
    const c = this.containers.get(id); if (!c || c.status !== "running") return null;
    return { stdout: `Executed: ${command}`, stderr: "", exitCode: 0 };
  }

  getLogs(id: string, lines: number = 100): string[] {
    const c = this.containers.get(id); if (!c) return [];
    return Array.from({ length: Math.min(lines, 10) }, (_, i) => `[${new Date().toISOString()}] Container ${id} log line ${i + 1}`);
  }

  getStats(id: string): { cpuPercent: number; memoryUsed: number; memoryLimit: number; networkIn: number; networkOut: number } | null {
    const c = this.containers.get(id); if (!c) return null;
    return { cpuPercent: Math.random() * 80, memoryUsed: Math.floor(c.memory * Math.random() * 0.8), memoryLimit: c.memory, networkIn: Math.floor(Math.random() * 10000), networkOut: Math.floor(Math.random() * 5000) };
  }
}

export const containerEngineService = new ContainerEngineService();
