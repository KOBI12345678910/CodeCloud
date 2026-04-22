export interface GeoRoute {
  id: string;
  region: string;
  endpoint: string;
  weight: number;
  healthy: boolean;
  latencyMs: number;
}

export interface GeoRoutingConfig {
  projectId: string;
  strategy: "latency" | "geographic" | "weighted" | "failover";
  routes: GeoRoute[];
  fallbackRegion: string;
}

class GeoRoutingService {
  private configs: Map<string, GeoRoutingConfig> = new Map();

  setConfig(projectId: string, config: Omit<GeoRoutingConfig, "projectId">): GeoRoutingConfig {
    const full: GeoRoutingConfig = { ...config, projectId };
    this.configs.set(projectId, full);
    return full;
  }

  getConfig(projectId: string): GeoRoutingConfig | null { return this.configs.get(projectId) || null; }

  resolve(projectId: string, clientRegion: string): GeoRoute | null {
    const config = this.configs.get(projectId);
    if (!config) return null;
    const healthy = config.routes.filter(r => r.healthy);
    if (healthy.length === 0) return config.routes.find(r => r.region === config.fallbackRegion) || null;
    if (config.strategy === "geographic") return healthy.find(r => r.region === clientRegion) || healthy[0];
    if (config.strategy === "latency") return healthy.sort((a, b) => a.latencyMs - b.latencyMs)[0];
    if (config.strategy === "weighted") {
      const totalWeight = healthy.reduce((s, r) => s + r.weight, 0);
      let rand = Math.random() * totalWeight;
      for (const r of healthy) { rand -= r.weight; if (rand <= 0) return r; }
    }
    return healthy[0];
  }

  listConfigs(): GeoRoutingConfig[] { return Array.from(this.configs.values()); }
  deleteConfig(projectId: string): boolean { return this.configs.delete(projectId); }
}

export const geoRoutingService = new GeoRoutingService();
