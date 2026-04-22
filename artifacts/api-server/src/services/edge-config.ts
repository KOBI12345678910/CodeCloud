export interface EdgeConfig { id: string; projectId: string; key: string; value: any; region: string; ttl: number; createdAt: Date; updatedAt: Date; }
class EdgeConfigService {
  private configs: Map<string, EdgeConfig> = new Map();
  set(projectId: string, key: string, value: any, region: string = "global", ttl: number = 3600): EdgeConfig {
    const id = `ec-${projectId}-${key}`; const c: EdgeConfig = { id, projectId, key, value, region, ttl, createdAt: this.configs.get(id)?.createdAt || new Date(), updatedAt: new Date() };
    this.configs.set(id, c); return c;
  }
  get(projectId: string, key: string): EdgeConfig | null { return this.configs.get(`ec-${projectId}-${key}`) || null; }
  listByProject(projectId: string): EdgeConfig[] { return Array.from(this.configs.values()).filter(c => c.projectId === projectId); }
  delete(projectId: string, key: string): boolean { return this.configs.delete(`ec-${projectId}-${key}`); }
}
export const edgeConfigService = new EdgeConfigService();
