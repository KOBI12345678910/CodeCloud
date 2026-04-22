export interface WebSocketEndpoint {
  id: string;
  projectId: string;
  deploymentId: string;
  path: string;
  enabled: boolean;
  maxConnections: number;
  activeConnections: number;
  heartbeat: HeartbeatConfig;
  rateLimit: RateLimitConfig;
  protocols: string[];
  origins: string[];
  metrics: WebSocketMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface HeartbeatConfig {
  enabled: boolean;
  intervalMs: number;
  timeoutMs: number;
  maxMissed: number;
}

export interface RateLimitConfig {
  messagesPerSecond: number;
  maxMessageSizeBytes: number;
  burstLimit: number;
}

export interface WebSocketMetrics {
  totalConnections: number;
  totalMessages: number;
  totalBytesSent: number;
  totalBytesReceived: number;
  avgConnectionDurationMs: number;
  peakConcurrentConnections: number;
  errorCount: number;
  timeouts: number;
  messagesByType: Record<string, number>;
  connectionsOverTime: { timestamp: string; count: number }[];
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
}

const endpoints: WebSocketEndpoint[] = [
  {
    id: "ws1", projectId: "p1", deploymentId: "dep-prod-1", path: "/ws",
    enabled: true, maxConnections: 10000, activeConnections: 847,
    heartbeat: { enabled: true, intervalMs: 30000, timeoutMs: 10000, maxMissed: 3 },
    rateLimit: { messagesPerSecond: 100, maxMessageSizeBytes: 65536, burstLimit: 200 },
    protocols: ["graphql-ws", "subscriptions-transport-ws"], origins: ["https://app.codecloud.dev", "https://codecloud.dev"],
    metrics: {
      totalConnections: 145230, totalMessages: 28400000, totalBytesSent: 12800000000,
      totalBytesReceived: 4200000000, avgConnectionDurationMs: 342000,
      peakConcurrentConnections: 2340, errorCount: 127, timeouts: 89,
      messagesByType: { subscribe: 245000, data: 27800000, complete: 240000, ping: 115000 },
      connectionsOverTime: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
        count: Math.floor(400 + Math.random() * 600),
      })),
      latencyP50Ms: 2.4, latencyP95Ms: 12.8, latencyP99Ms: 45.2,
    },
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "ws2", projectId: "p1", deploymentId: "dep-prod-1", path: "/ws/terminal",
    enabled: true, maxConnections: 5000, activeConnections: 234,
    heartbeat: { enabled: true, intervalMs: 15000, timeoutMs: 5000, maxMissed: 2 },
    rateLimit: { messagesPerSecond: 50, maxMessageSizeBytes: 32768, burstLimit: 100 },
    protocols: ["terminal-v1"], origins: ["https://app.codecloud.dev"],
    metrics: {
      totalConnections: 52100, totalMessages: 8900000, totalBytesSent: 3400000000,
      totalBytesReceived: 1800000000, avgConnectionDurationMs: 1200000,
      peakConcurrentConnections: 890, errorCount: 34, timeouts: 22,
      messagesByType: { input: 3200000, output: 5600000, resize: 45000, ping: 55000 },
      connectionsOverTime: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
        count: Math.floor(100 + Math.random() * 200),
      })),
      latencyP50Ms: 1.2, latencyP95Ms: 8.5, latencyP99Ms: 32.1,
    },
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "ws3", projectId: "p1", deploymentId: "dep-prod-1", path: "/ws/collab",
    enabled: true, maxConnections: 2000, activeConnections: 156,
    heartbeat: { enabled: true, intervalMs: 20000, timeoutMs: 8000, maxMissed: 3 },
    rateLimit: { messagesPerSecond: 200, maxMessageSizeBytes: 131072, burstLimit: 500 },
    protocols: ["crdt-v1", "yjs-v1"], origins: ["https://app.codecloud.dev"],
    metrics: {
      totalConnections: 31200, totalMessages: 42000000, totalBytesSent: 8900000000,
      totalBytesReceived: 9100000000, avgConnectionDurationMs: 890000,
      peakConcurrentConnections: 620, errorCount: 18, timeouts: 11,
      messagesByType: { sync: 12000000, update: 28000000, awareness: 1800000, ping: 200000 },
      connectionsOverTime: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
        count: Math.floor(80 + Math.random() * 150),
      })),
      latencyP50Ms: 1.8, latencyP95Ms: 6.2, latencyP99Ms: 18.5,
    },
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

export class DeployWebSocketService {
  async listEndpoints(projectId: string, deploymentId?: string): Promise<WebSocketEndpoint[]> {
    return endpoints.filter(e =>
      (e.projectId === projectId || e.projectId === "p1") &&
      (!deploymentId || e.deploymentId === deploymentId)
    );
  }

  async getEndpoint(id: string): Promise<WebSocketEndpoint | undefined> {
    return endpoints.find(e => e.id === id);
  }

  async createEndpoint(projectId: string, config: Partial<WebSocketEndpoint>): Promise<WebSocketEndpoint> {
    const ep: WebSocketEndpoint = {
      id: `ws${Date.now()}`, projectId,
      deploymentId: config.deploymentId || "dep-prod-1",
      path: config.path || "/ws/new",
      enabled: config.enabled ?? true,
      maxConnections: config.maxConnections || 1000,
      activeConnections: 0,
      heartbeat: config.heartbeat || { enabled: true, intervalMs: 30000, timeoutMs: 10000, maxMissed: 3 },
      rateLimit: config.rateLimit || { messagesPerSecond: 100, maxMessageSizeBytes: 65536, burstLimit: 200 },
      protocols: config.protocols || [],
      origins: config.origins || ["*"],
      metrics: {
        totalConnections: 0, totalMessages: 0, totalBytesSent: 0,
        totalBytesReceived: 0, avgConnectionDurationMs: 0,
        peakConcurrentConnections: 0, errorCount: 0, timeouts: 0,
        messagesByType: {}, connectionsOverTime: [], latencyP50Ms: 0, latencyP95Ms: 0, latencyP99Ms: 0,
      },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    endpoints.push(ep);
    return ep;
  }

  async updateEndpoint(id: string, updates: Partial<WebSocketEndpoint>): Promise<WebSocketEndpoint | null> {
    const ep = endpoints.find(e => e.id === id);
    if (!ep) return null;
    if (updates.path !== undefined) ep.path = updates.path;
    if (updates.enabled !== undefined) ep.enabled = updates.enabled;
    if (updates.maxConnections !== undefined) ep.maxConnections = updates.maxConnections;
    if (updates.heartbeat) ep.heartbeat = { ...ep.heartbeat, ...updates.heartbeat };
    if (updates.rateLimit) ep.rateLimit = { ...ep.rateLimit, ...updates.rateLimit };
    if (updates.protocols) ep.protocols = updates.protocols;
    if (updates.origins) ep.origins = updates.origins;
    ep.updatedAt = new Date().toISOString();
    return ep;
  }

  async deleteEndpoint(id: string): Promise<boolean> {
    const idx = endpoints.findIndex(e => e.id === id);
    if (idx === -1) return false;
    endpoints.splice(idx, 1);
    return true;
  }

  async getMetrics(id: string): Promise<WebSocketMetrics | null> {
    const ep = endpoints.find(e => e.id === id);
    return ep ? ep.metrics : null;
  }

  async resetMetrics(id: string): Promise<boolean> {
    const ep = endpoints.find(e => e.id === id);
    if (!ep) return false;
    ep.metrics = {
      totalConnections: 0, totalMessages: 0, totalBytesSent: 0,
      totalBytesReceived: 0, avgConnectionDurationMs: 0,
      peakConcurrentConnections: 0, errorCount: 0, timeouts: 0,
      messagesByType: {}, connectionsOverTime: [], latencyP50Ms: 0, latencyP95Ms: 0, latencyP99Ms: 0,
    };
    return true;
  }
}

export const deployWebSocketService = new DeployWebSocketService();
