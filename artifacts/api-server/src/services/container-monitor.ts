export type ContainerStatus = "running" | "stopped" | "starting" | "crashed" | "zombie";
export type HealthStatus = "healthy" | "unhealthy" | "degraded" | "unknown";

export interface ContainerMetrics {
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number;
  memoryPercent: number;
  diskMb: number;
  diskLimitMb: number;
  diskPercent: number;
  networkInKb: number;
  networkOutKb: number;
  uptimeSeconds: number;
  restartCount: number;
  pid: number;
}

export interface ContainerInfo {
  containerId: string;
  projectId: string;
  projectName: string;
  userId: string;
  status: ContainerStatus;
  health: HealthStatus;
  metrics: ContainerMetrics;
  createdAt: string;
  lastHealthCheck: string;
  alerts: ContainerAlert[];
}

export interface ContainerAlert {
  type: "cpu_high" | "memory_high" | "disk_high" | "unhealthy" | "zombie" | "restart_loop";
  severity: "warning" | "critical";
  message: string;
  timestamp: string;
  threshold: number;
  currentValue: number;
}

export interface ContainerSummary {
  total: number;
  running: number;
  stopped: number;
  crashed: number;
  zombie: number;
  healthy: number;
  unhealthy: number;
  degraded: number;
  totalCpuPercent: number;
  totalMemoryMb: number;
  totalDiskMb: number;
  alertCount: number;
}

const containers = new Map<string, ContainerInfo>();

const THRESHOLDS = {
  cpuWarning: 80,
  cpuCritical: 95,
  memoryWarning: 80,
  memoryCritical: 95,
  diskWarning: 80,
  diskCritical: 95,
  maxRestarts: 10,
  zombieTimeoutMs: 30 * 60 * 1000,
};

function generateMetrics(status: ContainerStatus): ContainerMetrics {
  const isRunning = status === "running";
  return {
    cpuPercent: isRunning ? Math.round(Math.random() * 60 + 5) : 0,
    memoryMb: isRunning ? Math.round(Math.random() * 400 + 50) : 0,
    memoryLimitMb: 512,
    memoryPercent: 0,
    diskMb: Math.round(Math.random() * 800 + 100),
    diskLimitMb: 1024,
    diskPercent: 0,
    networkInKb: isRunning ? Math.round(Math.random() * 5000) : 0,
    networkOutKb: isRunning ? Math.round(Math.random() * 3000) : 0,
    uptimeSeconds: isRunning ? Math.floor(Math.random() * 86400) : 0,
    restartCount: Math.floor(Math.random() * 3),
    pid: isRunning ? Math.floor(Math.random() * 30000) + 1000 : 0,
  };
}

function computePercentages(metrics: ContainerMetrics): void {
  metrics.memoryPercent = metrics.memoryLimitMb > 0
    ? Math.round((metrics.memoryMb / metrics.memoryLimitMb) * 100)
    : 0;
  metrics.diskPercent = metrics.diskLimitMb > 0
    ? Math.round((metrics.diskMb / metrics.diskLimitMb) * 100)
    : 0;
}

function checkAlerts(container: ContainerInfo): ContainerAlert[] {
  const alerts: ContainerAlert[] = [];
  const now = new Date().toISOString();
  const m = container.metrics;

  if (m.cpuPercent >= THRESHOLDS.cpuCritical) {
    alerts.push({
      type: "cpu_high",
      severity: "critical",
      message: `CPU usage at ${m.cpuPercent}% (critical threshold: ${THRESHOLDS.cpuCritical}%)`,
      timestamp: now,
      threshold: THRESHOLDS.cpuCritical,
      currentValue: m.cpuPercent,
    });
  } else if (m.cpuPercent >= THRESHOLDS.cpuWarning) {
    alerts.push({
      type: "cpu_high",
      severity: "warning",
      message: `CPU usage at ${m.cpuPercent}% (warning threshold: ${THRESHOLDS.cpuWarning}%)`,
      timestamp: now,
      threshold: THRESHOLDS.cpuWarning,
      currentValue: m.cpuPercent,
    });
  }

  if (m.memoryPercent >= THRESHOLDS.memoryCritical) {
    alerts.push({
      type: "memory_high",
      severity: "critical",
      message: `Memory usage at ${m.memoryPercent}% (${m.memoryMb}MB / ${m.memoryLimitMb}MB)`,
      timestamp: now,
      threshold: THRESHOLDS.memoryCritical,
      currentValue: m.memoryPercent,
    });
  } else if (m.memoryPercent >= THRESHOLDS.memoryWarning) {
    alerts.push({
      type: "memory_high",
      severity: "warning",
      message: `Memory usage at ${m.memoryPercent}% (${m.memoryMb}MB / ${m.memoryLimitMb}MB)`,
      timestamp: now,
      threshold: THRESHOLDS.memoryWarning,
      currentValue: m.memoryPercent,
    });
  }

  if (m.diskPercent >= THRESHOLDS.diskCritical) {
    alerts.push({
      type: "disk_high",
      severity: "critical",
      message: `Disk usage at ${m.diskPercent}% (${m.diskMb}MB / ${m.diskLimitMb}MB)`,
      timestamp: now,
      threshold: THRESHOLDS.diskCritical,
      currentValue: m.diskPercent,
    });
  } else if (m.diskPercent >= THRESHOLDS.diskWarning) {
    alerts.push({
      type: "disk_high",
      severity: "warning",
      message: `Disk usage at ${m.diskPercent}% (${m.diskMb}MB / ${m.diskLimitMb}MB)`,
      timestamp: now,
      threshold: THRESHOLDS.diskWarning,
      currentValue: m.diskPercent,
    });
  }

  if (container.status === "zombie") {
    alerts.push({
      type: "zombie",
      severity: "critical",
      message: "Container detected as zombie — no response to health checks",
      timestamp: now,
      threshold: THRESHOLDS.zombieTimeoutMs,
      currentValue: m.uptimeSeconds * 1000,
    });
  }

  if (m.restartCount >= THRESHOLDS.maxRestarts) {
    alerts.push({
      type: "restart_loop",
      severity: "critical",
      message: `Container restarted ${m.restartCount} times (limit: ${THRESHOLDS.maxRestarts})`,
      timestamp: now,
      threshold: THRESHOLDS.maxRestarts,
      currentValue: m.restartCount,
    });
  }

  if (container.health === "unhealthy") {
    alerts.push({
      type: "unhealthy",
      severity: "critical",
      message: "Container health check failing",
      timestamp: now,
      threshold: 0,
      currentValue: 0,
    });
  }

  return alerts;
}

export function registerContainer(
  containerId: string,
  projectId: string,
  projectName: string,
  userId: string
): ContainerInfo {
  const metrics = generateMetrics("running");
  computePercentages(metrics);
  const now = new Date().toISOString();

  const container: ContainerInfo = {
    containerId,
    projectId,
    projectName,
    userId,
    status: "running",
    health: "healthy",
    metrics,
    createdAt: now,
    lastHealthCheck: now,
    alerts: [],
  };

  container.alerts = checkAlerts(container);
  containers.set(containerId, container);
  return container;
}

export function removeContainer(containerId: string): boolean {
  return containers.delete(containerId);
}

export function getContainer(containerId: string): ContainerInfo | undefined {
  return containers.get(containerId);
}

export function getAllContainers(): ContainerInfo[] {
  const result: ContainerInfo[] = [];
  for (const container of containers.values()) {
    container.metrics = generateMetrics(container.status);
    computePercentages(container.metrics);
    container.lastHealthCheck = new Date().toISOString();

    if (container.status === "running") {
      const roll = Math.random();
      if (roll < 0.05) container.health = "unhealthy";
      else if (roll < 0.15) container.health = "degraded";
      else container.health = "healthy";
    } else {
      container.health = "unknown";
    }

    container.alerts = checkAlerts(container);
    result.push(container);
  }
  return result;
}

export function getContainersByProject(projectId: string): ContainerInfo[] {
  return getAllContainers().filter((c) => c.projectId === projectId);
}

export function getSummary(): ContainerSummary {
  const all = getAllContainers();
  let alertCount = 0;
  let totalCpu = 0;
  let totalMem = 0;
  let totalDisk = 0;

  const summary: ContainerSummary = {
    total: all.length,
    running: 0,
    stopped: 0,
    crashed: 0,
    zombie: 0,
    healthy: 0,
    unhealthy: 0,
    degraded: 0,
    totalCpuPercent: 0,
    totalMemoryMb: 0,
    totalDiskMb: 0,
    alertCount: 0,
  };

  for (const c of all) {
    if (c.status === "running") summary.running++;
    else if (c.status === "stopped") summary.stopped++;
    else if (c.status === "crashed") summary.crashed++;
    else if (c.status === "zombie") summary.zombie++;

    if (c.health === "healthy") summary.healthy++;
    else if (c.health === "unhealthy") summary.unhealthy++;
    else if (c.health === "degraded") summary.degraded++;

    totalCpu += c.metrics.cpuPercent;
    totalMem += c.metrics.memoryMb;
    totalDisk += c.metrics.diskMb;
    alertCount += c.alerts.length;
  }

  summary.totalCpuPercent = Math.round(totalCpu);
  summary.totalMemoryMb = Math.round(totalMem);
  summary.totalDiskMb = Math.round(totalDisk);
  summary.alertCount = alertCount;

  return summary;
}

export function restartContainer(containerId: string): ContainerInfo | undefined {
  const container = containers.get(containerId);
  if (!container) return undefined;

  container.status = "running";
  container.health = "healthy";
  container.metrics.restartCount++;
  container.metrics.uptimeSeconds = 0;
  container.metrics = generateMetrics("running");
  computePercentages(container.metrics);
  container.lastHealthCheck = new Date().toISOString();
  container.alerts = checkAlerts(container);
  return container;
}

export function stopContainer(containerId: string): ContainerInfo | undefined {
  const container = containers.get(containerId);
  if (!container) return undefined;

  container.status = "stopped";
  container.health = "unknown";
  container.metrics = generateMetrics("stopped");
  computePercentages(container.metrics);
  container.alerts = checkAlerts(container);
  return container;
}

export function cleanupZombies(): string[] {
  const cleaned: string[] = [];
  for (const [id, container] of containers.entries()) {
    if (container.status === "zombie") {
      containers.delete(id);
      cleaned.push(id);
    }
  }
  return cleaned;
}

export function autoRestartUnhealthy(): string[] {
  const restarted: string[] = [];
  for (const [id, container] of containers.entries()) {
    if (
      container.health === "unhealthy" &&
      container.status === "running" &&
      container.metrics.restartCount < THRESHOLDS.maxRestarts
    ) {
      restartContainer(id);
      restarted.push(id);
    }
  }
  return restarted;
}

export function getAlerts(): ContainerAlert[] {
  const all = getAllContainers();
  const alerts: ContainerAlert[] = [];
  for (const c of all) {
    alerts.push(...c.alerts);
  }
  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export function seedDemoContainers(): void {
  if (containers.size > 0) return;

  const demos = [
    { id: "ctr-001", projectId: "proj-001", name: "react-dashboard", userId: "user-001" },
    { id: "ctr-002", projectId: "proj-002", name: "express-api", userId: "user-001" },
    { id: "ctr-003", projectId: "proj-003", name: "python-ml-model", userId: "user-002" },
    { id: "ctr-004", projectId: "proj-004", name: "go-microservice", userId: "user-002" },
    { id: "ctr-005", projectId: "proj-005", name: "nextjs-blog", userId: "user-003" },
  ];

  for (const d of demos) {
    registerContainer(d.id, d.projectId, d.name, d.userId);
  }
}
