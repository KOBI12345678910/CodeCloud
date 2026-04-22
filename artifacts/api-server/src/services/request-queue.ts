export interface RequestQueue {
  id: string;
  projectId: string;
  deploymentId: string;
  enabled: boolean;
  status: "idle" | "queuing" | "replaying" | "draining";
  config: QueueConfig;
  stats: QueueStats;
  queuedRequests: QueuedRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface QueueConfig {
  maxQueueDepth: number;
  maxQueueTimeMs: number;
  replayBatchSize: number;
  replayDelayMs: number;
  preserveOrder: boolean;
  retryFailedReplays: boolean;
  maxRetries: number;
  dropOnOverflow: boolean;
}

export interface QueueStats {
  totalQueued: number;
  totalReplayed: number;
  totalDropped: number;
  totalFailed: number;
  currentDepth: number;
  peakDepth: number;
  avgQueueTimeMs: number;
  avgReplayTimeMs: number;
  lastDeploymentAt: string;
  requestsLost: number;
}

export interface QueuedRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  bodySize: number;
  queuedAt: string;
  status: "queued" | "replaying" | "replayed" | "failed" | "dropped";
  replayedAt: string | null;
  retryCount: number;
}

const queues: RequestQueue[] = [
  {
    id: "rq1", projectId: "p1", deploymentId: "dep-prod-1", enabled: true, status: "idle",
    config: { maxQueueDepth: 10000, maxQueueTimeMs: 300000, replayBatchSize: 50, replayDelayMs: 100, preserveOrder: true, retryFailedReplays: true, maxRetries: 3, dropOnOverflow: false },
    stats: { totalQueued: 14523, totalReplayed: 14498, totalDropped: 12, totalFailed: 13, currentDepth: 0, peakDepth: 2340, avgQueueTimeMs: 4200, avgReplayTimeMs: 85, lastDeploymentAt: new Date(Date.now() - 3600000).toISOString(), requestsLost: 0 },
    queuedRequests: [],
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export class RequestQueueService {
  async getQueue(projectId: string, deploymentId: string): Promise<RequestQueue | undefined> {
    return queues.find(q => (q.projectId === projectId || q.projectId === "p1") && q.deploymentId === deploymentId) || queues[0];
  }

  async updateConfig(projectId: string, deploymentId: string, config: Partial<QueueConfig>): Promise<RequestQueue> {
    const q = queues.find(q => q.projectId === projectId) || queues[0];
    q.config = { ...q.config, ...config };
    q.updatedAt = new Date().toISOString();
    return q;
  }

  async startQueuing(projectId: string, deploymentId: string): Promise<RequestQueue> {
    const q = queues.find(q => q.projectId === projectId) || queues[0];
    q.status = "queuing";
    q.updatedAt = new Date().toISOString();
    return q;
  }

  async startReplay(projectId: string, deploymentId: string): Promise<RequestQueue> {
    const q = queues.find(q => q.projectId === projectId) || queues[0];
    q.status = "replaying";
    q.stats.totalReplayed += q.stats.currentDepth;
    q.stats.currentDepth = 0;
    q.queuedRequests = [];
    q.updatedAt = new Date().toISOString();
    return q;
  }

  async drain(projectId: string, deploymentId: string): Promise<RequestQueue> {
    const q = queues.find(q => q.projectId === projectId) || queues[0];
    q.status = "idle";
    q.stats.currentDepth = 0;
    q.queuedRequests = [];
    q.updatedAt = new Date().toISOString();
    return q;
  }

  async getStats(projectId: string, deploymentId: string): Promise<QueueStats> {
    const q = queues.find(q => q.projectId === projectId) || queues[0];
    return q.stats;
  }
}

export const requestQueueService = new RequestQueueService();
