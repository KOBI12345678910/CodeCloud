export interface Region {
  id: string;
  name: string;
  location: string;
  provider: string;
  status: "active" | "degraded" | "offline";
  latencyMs: number;
}

export interface MultiRegionDeployment {
  id: string;
  projectId: string;
  regions: string[];
  primaryRegion: string;
  strategy: "active-active" | "active-passive" | "read-replica";
  status: "deploying" | "active" | "failed";
  createdAt: Date;
}

class MultiRegionService {
  private regions: Map<string, Region> = new Map();
  private deployments: Map<string, MultiRegionDeployment> = new Map();

  constructor() {
    const defaults: Region[] = [
      { id: "us-east-1", name: "US East", location: "Virginia", provider: "aws", status: "active", latencyMs: 15 },
      { id: "us-west-2", name: "US West", location: "Oregon", provider: "aws", status: "active", latencyMs: 45 },
      { id: "eu-west-1", name: "EU West", location: "Ireland", provider: "aws", status: "active", latencyMs: 85 },
      { id: "ap-southeast-1", name: "Asia Pacific", location: "Singapore", provider: "aws", status: "active", latencyMs: 120 },
    ];
    for (const r of defaults) this.regions.set(r.id, r);
  }

  getRegions(): Region[] { return Array.from(this.regions.values()); }
  getRegion(id: string): Region | null { return this.regions.get(id) || null; }

  deploy(projectId: string, regions: string[], primaryRegion: string, strategy: MultiRegionDeployment["strategy"]): MultiRegionDeployment {
    const id = `mrd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const deployment: MultiRegionDeployment = { id, projectId, regions, primaryRegion, strategy, status: "active", createdAt: new Date() };
    this.deployments.set(id, deployment);
    return deployment;
  }

  getDeployments(projectId?: string): MultiRegionDeployment[] {
    const all = Array.from(this.deployments.values());
    return projectId ? all.filter(d => d.projectId === projectId) : all;
  }

  getDeployment(id: string): MultiRegionDeployment | null { return this.deployments.get(id) || null; }
  deleteDeployment(id: string): boolean { return this.deployments.delete(id); }
}

export const multiRegionService = new MultiRegionService();
