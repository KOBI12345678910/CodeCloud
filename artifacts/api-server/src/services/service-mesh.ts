export interface ServiceEndpoint { id: string; projectId: string; name: string; host: string; port: number; protocol: "http" | "https" | "grpc" | "tcp"; healthCheck: string; healthy: boolean; lastCheck: Date; }
class ServiceMeshService {
  private endpoints: Map<string, ServiceEndpoint> = new Map();
  register(data: { projectId: string; name: string; host: string; port: number; protocol?: ServiceEndpoint["protocol"]; healthCheck?: string }): ServiceEndpoint {
    const id = `svc-${Date.now()}`; const e: ServiceEndpoint = { id, ...data, protocol: data.protocol || "http", healthCheck: data.healthCheck || "/health", healthy: true, lastCheck: new Date() };
    this.endpoints.set(id, e); return e;
  }
  discover(projectId: string, name: string): ServiceEndpoint | null { return Array.from(this.endpoints.values()).find(e => e.projectId === projectId && e.name === name && e.healthy) || null; }
  list(projectId: string): ServiceEndpoint[] { return Array.from(this.endpoints.values()).filter(e => e.projectId === projectId); }
  checkHealth(id: string): ServiceEndpoint | null { const e = this.endpoints.get(id); if (!e) return null; e.healthy = Math.random() > 0.05; e.lastCheck = new Date(); return e; }
  deregister(id: string): boolean { return this.endpoints.delete(id); }
}
export const serviceMeshService = new ServiceMeshService();
