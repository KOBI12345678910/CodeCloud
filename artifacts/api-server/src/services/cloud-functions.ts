export interface CloudFunction { id: string; projectId: string; name: string; runtime: string; handler: string; memory: number; timeout: number; env: Record<string, string>; status: "inactive" | "deploying" | "active" | "error"; lastInvoked: Date | null; invocationCount: number; createdAt: Date; }
class CloudFunctionsService {
  private functions: Map<string, CloudFunction> = new Map();
  create(data: { projectId: string; name: string; runtime?: string; handler?: string; memory?: number; timeout?: number }): CloudFunction {
    const id = `fn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; const f: CloudFunction = { id, projectId: data.projectId, name: data.name, runtime: data.runtime || "nodejs18", handler: data.handler || "index.handler", memory: data.memory || 256, timeout: data.timeout || 30, env: {}, status: "inactive", lastInvoked: null, invocationCount: 0, createdAt: new Date() };
    this.functions.set(id, f); return f;
  }
  deploy(id: string): CloudFunction | null { const f = this.functions.get(id); if (!f) return null; f.status = "active"; return f; }
  invoke(id: string, payload: any): { result: any; duration: number } | null { const f = this.functions.get(id); if (!f || f.status !== "active") return null; f.lastInvoked = new Date(); f.invocationCount++; return { result: { statusCode: 200, body: "OK" }, duration: Math.random() * 500 }; }
  get(id: string): CloudFunction | null { return this.functions.get(id) || null; }
  listByProject(projectId: string): CloudFunction[] { return Array.from(this.functions.values()).filter(f => f.projectId === projectId); }
  delete(id: string): boolean { return this.functions.delete(id); }
}
export const cloudFunctionsService = new CloudFunctionsService();
