export interface CanaryDeployment {
  id: string;
  projectId: string;
  baseVersion: string;
  canaryVersion: string;
  trafficPercent: number;
  status: "running" | "promoted" | "rolled-back" | "analyzing";
  metrics: CanaryMetrics;
  startedAt: Date;
  endedAt: Date | null;
}

export interface CanaryMetrics {
  baseErrorRate: number;
  canaryErrorRate: number;
  baseLatency: number;
  canaryLatency: number;
  baseSuccessRate: number;
  canarySuccessRate: number;
  verdict: "pass" | "fail" | "inconclusive";
}

class CanaryAnalysisService {
  private deployments: Map<string, CanaryDeployment> = new Map();

  start(projectId: string, baseVersion: string, canaryVersion: string, trafficPercent: number = 10): CanaryDeployment {
    const id = `canary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const deployment: CanaryDeployment = {
      id, projectId, baseVersion, canaryVersion, trafficPercent, status: "running",
      metrics: { baseErrorRate: 0, canaryErrorRate: 0, baseLatency: 0, canaryLatency: 0, baseSuccessRate: 100, canarySuccessRate: 100, verdict: "inconclusive" },
      startedAt: new Date(), endedAt: null,
    };
    this.deployments.set(id, deployment);
    return deployment;
  }

  analyze(id: string): CanaryDeployment | null {
    const d = this.deployments.get(id); if (!d) return null;
    d.status = "analyzing";
    d.metrics = {
      baseErrorRate: Math.random() * 2, canaryErrorRate: Math.random() * 3,
      baseLatency: 50 + Math.random() * 50, canaryLatency: 45 + Math.random() * 60,
      baseSuccessRate: 97 + Math.random() * 3, canarySuccessRate: 96 + Math.random() * 4,
      verdict: Math.random() > 0.3 ? "pass" : "fail",
    };
    return d;
  }

  promote(id: string): boolean { const d = this.deployments.get(id); if (!d) return false; d.status = "promoted"; d.endedAt = new Date(); return true; }
  rollback(id: string): boolean { const d = this.deployments.get(id); if (!d) return false; d.status = "rolled-back"; d.endedAt = new Date(); return true; }
  get(id: string): CanaryDeployment | null { return this.deployments.get(id) || null; }
  list(projectId?: string): CanaryDeployment[] {
    const all = Array.from(this.deployments.values());
    return projectId ? all.filter(d => d.projectId === projectId) : all;
  }
}

export const canaryAnalysisService = new CanaryAnalysisService();
