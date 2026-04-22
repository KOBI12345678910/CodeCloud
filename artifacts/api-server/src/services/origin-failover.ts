export interface OriginConfig {
  id: string;
  projectId: string;
  deploymentId: string;
  origins: Origin[];
  activeOriginId: string;
  failoverPolicy: FailoverPolicy;
  notifications: FailoverNotification[];
  createdAt: string;
  updatedAt: string;
}

export interface Origin {
  id: string;
  url: string;
  priority: number;
  weight: number;
  healthy: boolean;
  lastHealthCheck: string;
  consecutiveFailures: number;
  responseTimeMs: number;
  region: string;
}

export interface FailoverPolicy {
  healthCheckIntervalMs: number;
  healthCheckPath: string;
  healthCheckTimeoutMs: number;
  failureThreshold: number;
  recoveryThreshold: number;
  automaticFailover: boolean;
  automaticRecovery: boolean;
}

export interface FailoverNotification {
  id: string;
  type: "failover" | "recovery" | "degraded";
  fromOrigin: string;
  toOrigin: string;
  reason: string;
  timestamp: string;
  acknowledged: boolean;
}

const configs: OriginConfig[] = [
  {
    id: "of1", projectId: "p1", deploymentId: "dep-prod-1",
    origins: [
      { id: "o1", url: "https://us-east.app.codecloud.dev", priority: 1, weight: 70, healthy: true, lastHealthCheck: new Date(Date.now() - 30000).toISOString(), consecutiveFailures: 0, responseTimeMs: 45, region: "us-east-1" },
      { id: "o2", url: "https://us-west.app.codecloud.dev", priority: 2, weight: 20, healthy: true, lastHealthCheck: new Date(Date.now() - 30000).toISOString(), consecutiveFailures: 0, responseTimeMs: 82, region: "us-west-2" },
      { id: "o3", url: "https://eu-west.app.codecloud.dev", priority: 3, weight: 10, healthy: false, lastHealthCheck: new Date(Date.now() - 60000).toISOString(), consecutiveFailures: 4, responseTimeMs: 0, region: "eu-west-1" },
    ],
    activeOriginId: "o1",
    failoverPolicy: { healthCheckIntervalMs: 30000, healthCheckPath: "/healthz", healthCheckTimeoutMs: 5000, failureThreshold: 3, recoveryThreshold: 2, automaticFailover: true, automaticRecovery: true },
    notifications: [
      { id: "n1", type: "failover", fromOrigin: "eu-west", toOrigin: "us-east", reason: "3 consecutive health check failures", timestamp: new Date(Date.now() - 3600000).toISOString(), acknowledged: true },
      { id: "n2", type: "degraded", fromOrigin: "eu-west", toOrigin: "", reason: "Origin eu-west-1 unhealthy, running on 2/3 origins", timestamp: new Date(Date.now() - 3600000).toISOString(), acknowledged: false },
    ],
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export class OriginFailoverService {
  async getConfig(projectId: string, deploymentId: string): Promise<OriginConfig | undefined> {
    return configs.find(c => (c.projectId === projectId || c.projectId === "p1") && c.deploymentId === deploymentId) || configs[0];
  }

  async updateConfig(projectId: string, deploymentId: string, updates: Partial<OriginConfig>): Promise<OriginConfig> {
    const cfg = configs.find(c => c.projectId === projectId && c.deploymentId === deploymentId) || configs[0];
    if (updates.failoverPolicy) cfg.failoverPolicy = { ...cfg.failoverPolicy, ...updates.failoverPolicy };
    if (updates.origins) cfg.origins = updates.origins;
    cfg.updatedAt = new Date().toISOString();
    return cfg;
  }

  async addOrigin(projectId: string, deploymentId: string, origin: Partial<Origin>): Promise<OriginConfig> {
    const cfg = configs.find(c => c.projectId === projectId) || configs[0];
    cfg.origins.push({
      id: `o${Date.now()}`, url: origin.url || "", priority: origin.priority || cfg.origins.length + 1,
      weight: origin.weight || 10, healthy: true, lastHealthCheck: new Date().toISOString(),
      consecutiveFailures: 0, responseTimeMs: 0, region: origin.region || "unknown",
    });
    cfg.updatedAt = new Date().toISOString();
    return cfg;
  }

  async removeOrigin(projectId: string, originId: string): Promise<boolean> {
    const cfg = configs.find(c => c.projectId === projectId) || configs[0];
    const idx = cfg.origins.findIndex(o => o.id === originId);
    if (idx === -1) return false;
    cfg.origins.splice(idx, 1);
    cfg.updatedAt = new Date().toISOString();
    return true;
  }

  async triggerFailover(projectId: string, targetOriginId: string): Promise<OriginConfig> {
    const cfg = configs.find(c => c.projectId === projectId) || configs[0];
    const prev = cfg.activeOriginId;
    cfg.activeOriginId = targetOriginId;
    cfg.notifications.push({
      id: `n${Date.now()}`, type: "failover", fromOrigin: prev, toOrigin: targetOriginId,
      reason: "Manual failover triggered", timestamp: new Date().toISOString(), acknowledged: false,
    });
    cfg.updatedAt = new Date().toISOString();
    return cfg;
  }

  async acknowledgeNotification(projectId: string, notificationId: string): Promise<boolean> {
    const cfg = configs.find(c => c.projectId === projectId) || configs[0];
    const n = cfg.notifications.find(x => x.id === notificationId);
    if (!n) return false;
    n.acknowledged = true;
    return true;
  }
}

export const originFailoverService = new OriginFailoverService();
