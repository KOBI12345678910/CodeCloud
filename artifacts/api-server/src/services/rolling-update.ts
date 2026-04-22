export interface RollingUpdateConfig {
  maxSurge: number;
  maxUnavailable: number;
  healthCheckPath: string;
  healthCheckInterval: number;
  drainTimeout: number;
  rollbackOnFailure: boolean;
}

export interface UpdateStatus {
  id: string;
  projectId: string;
  fromVersion: string;
  toVersion: string;
  status: "pending" | "in_progress" | "completed" | "rolling_back" | "failed";
  totalInstances: number;
  updatedInstances: number;
  healthyInstances: number;
  steps: UpdateStep[];
  startedAt: string;
  completedAt?: string;
  config: RollingUpdateConfig;
}

export interface UpdateStep {
  instance: string;
  status: "pending" | "draining" | "updating" | "health_check" | "healthy" | "failed";
  startedAt?: string;
  duration?: number;
}

export function startRollingUpdate(projectId: string, toVersion: string, config?: Partial<RollingUpdateConfig>): UpdateStatus {
  const total = 4;
  const fullConfig: RollingUpdateConfig = { maxSurge: 1, maxUnavailable: 0, healthCheckPath: "/health", healthCheckInterval: 5, drainTimeout: 30, rollbackOnFailure: true, ...config };

  const steps: UpdateStep[] = Array.from({ length: total }, (_, i) => ({
    instance: `instance-${i + 1}`,
    status: i === 0 ? "draining" : "pending",
    startedAt: i === 0 ? new Date().toISOString() : undefined,
  }));

  return {
    id: crypto.randomUUID(), projectId, fromVersion: "v1.0.0", toVersion, status: "in_progress",
    totalInstances: total, updatedInstances: 0, healthyInstances: total - 1,
    steps, startedAt: new Date().toISOString(), config: fullConfig,
  };
}

export function getUpdateStatus(updateId: string): UpdateStatus {
  return {
    id: updateId, projectId: "proj-1", fromVersion: "v1.0.0", toVersion: "v2.0.0", status: "in_progress",
    totalInstances: 4, updatedInstances: 2, healthyInstances: 4,
    steps: [
      { instance: "instance-1", status: "healthy", startedAt: new Date(Date.now() - 120000).toISOString(), duration: 45 },
      { instance: "instance-2", status: "healthy", startedAt: new Date(Date.now() - 60000).toISOString(), duration: 38 },
      { instance: "instance-3", status: "health_check", startedAt: new Date(Date.now() - 15000).toISOString() },
      { instance: "instance-4", status: "pending" },
    ],
    startedAt: new Date(Date.now() - 180000).toISOString(), config: { maxSurge: 1, maxUnavailable: 0, healthCheckPath: "/health", healthCheckInterval: 5, drainTimeout: 30, rollbackOnFailure: true },
  };
}
