export interface EdgeFunction {
  id: string;
  projectId: string;
  name: string;
  code: string;
  version: number;
  regions: string[];
  route: string;
  runtime: "v8" | "wasm";
  memoryMB: number;
  timeoutMs: number;
  envVars: Record<string, string>;
  status: "deployed" | "deploying" | "failed" | "inactive";
  coldStartMs: number;
  invocations: number;
  createdAt: Date;
  updatedAt: Date;
}

class EdgeDeployService {
  private functions: Map<string, EdgeFunction> = new Map();

  deploy(projectId: string, name: string, code: string, route: string, regions?: string[]): EdgeFunction {
    const id = `ef-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fn: EdgeFunction = {
      id, projectId, name, code, version: 1,
      regions: regions || ["us-east-1", "eu-west-1", "ap-southeast-1"],
      route, runtime: "v8", memoryMB: 128, timeoutMs: 30000,
      envVars: {}, status: "deployed",
      coldStartMs: Math.random() * 0.8 + 0.1,
      invocations: 0, createdAt: new Date(), updatedAt: new Date(),
    };
    this.functions.set(id, fn);
    return fn;
  }

  get(id: string): EdgeFunction | null { return this.functions.get(id) || null; }
  list(projectId?: string): EdgeFunction[] {
    const all = Array.from(this.functions.values());
    return projectId ? all.filter(f => f.projectId === projectId) : all;
  }

  update(id: string, updates: Partial<Pick<EdgeFunction, "code" | "route" | "regions" | "memoryMB" | "timeoutMs" | "envVars">>): EdgeFunction | null {
    const fn = this.functions.get(id);
    if (!fn) return null;
    Object.assign(fn, updates, { version: fn.version + 1, updatedAt: new Date() });
    return fn;
  }

  invoke(id: string): { result: string; duration: number; region: string } | null {
    const fn = this.functions.get(id);
    if (!fn) return null;
    fn.invocations++;
    return { result: "OK", duration: Math.random() * 50 + 1, region: fn.regions[0] };
  }

  delete(id: string): boolean { return this.functions.delete(id); }
}

export const edgeDeployService = new EdgeDeployService();
