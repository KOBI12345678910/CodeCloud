export interface LogShippingConfig {
  id: string;
  projectId: string;
  destination: "datadog" | "splunk" | "elk" | "cloudwatch" | "custom";
  endpoint: string;
  apiKey: string;
  format: "json" | "syslog" | "cef" | "raw";
  filters: { level?: string[]; source?: string[]; pattern?: string }[];
  enabled: boolean;
  batchSize: number;
  flushIntervalMs: number;
  retryPolicy: { maxRetries: number; backoffMs: number };
  createdAt: string;
  updatedAt: string;
  stats: { totalShipped: number; totalDropped: number; totalFailed: number; lastShippedAt: string | null; avgLatencyMs: number };
}

const configs: LogShippingConfig[] = [
  {
    id: "ls1", projectId: "p1", destination: "datadog", endpoint: "https://http-intake.logs.datadoghq.com/v1/input",
    apiKey: "dd-***-redacted", format: "json", filters: [{ level: ["error", "warn"] }],
    enabled: true, batchSize: 100, flushIntervalMs: 5000, retryPolicy: { maxRetries: 3, backoffMs: 1000 },
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(),
    stats: { totalShipped: 145230, totalDropped: 42, totalFailed: 18, lastShippedAt: new Date(Date.now() - 30000).toISOString(), avgLatencyMs: 120 },
  },
  {
    id: "ls2", projectId: "p1", destination: "elk", endpoint: "https://elk.internal:9200/logs/_bulk",
    apiKey: "elk-***-redacted", format: "json", filters: [], enabled: true, batchSize: 500, flushIntervalMs: 10000,
    retryPolicy: { maxRetries: 5, backoffMs: 2000 },
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), updatedAt: new Date(Date.now() - 7200000).toISOString(),
    stats: { totalShipped: 892100, totalDropped: 0, totalFailed: 56, lastShippedAt: new Date(Date.now() - 10000).toISOString(), avgLatencyMs: 85 },
  },
  {
    id: "ls3", projectId: "p1", destination: "splunk", endpoint: "https://hec.splunk.example.com:8088/services/collector",
    apiKey: "splunk-***-redacted", format: "raw", filters: [{ source: ["container-stdout", "container-stderr"] }],
    enabled: false, batchSize: 200, flushIntervalMs: 15000, retryPolicy: { maxRetries: 3, backoffMs: 1500 },
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    stats: { totalShipped: 50200, totalDropped: 150, totalFailed: 320, lastShippedAt: new Date(Date.now() - 86400000 * 2).toISOString(), avgLatencyMs: 210 },
  },
];

export class LogShippingService {
  async listConfigs(projectId: string): Promise<LogShippingConfig[]> {
    return configs.filter(c => c.projectId === projectId || c.projectId === "p1");
  }

  async getConfig(id: string): Promise<LogShippingConfig | undefined> {
    return configs.find(c => c.id === id);
  }

  async createConfig(projectId: string, data: Partial<LogShippingConfig>): Promise<LogShippingConfig> {
    const config: LogShippingConfig = {
      id: `ls${Date.now()}`, projectId, destination: data.destination || "datadog",
      endpoint: data.endpoint || "", apiKey: data.apiKey || "", format: data.format || "json",
      filters: data.filters || [], enabled: data.enabled ?? true,
      batchSize: data.batchSize || 100, flushIntervalMs: data.flushIntervalMs || 5000,
      retryPolicy: data.retryPolicy || { maxRetries: 3, backoffMs: 1000 },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      stats: { totalShipped: 0, totalDropped: 0, totalFailed: 0, lastShippedAt: null, avgLatencyMs: 0 },
    };
    configs.push(config);
    return config;
  }

  async updateConfig(id: string, data: Partial<LogShippingConfig>): Promise<LogShippingConfig | null> {
    const cfg = configs.find(c => c.id === id);
    if (!cfg) return null;
    Object.assign(cfg, data, { updatedAt: new Date().toISOString() });
    return cfg;
  }

  async deleteConfig(id: string): Promise<boolean> {
    const idx = configs.findIndex(c => c.id === id);
    if (idx < 0) return false;
    configs.splice(idx, 1);
    return true;
  }

  async testConnection(id: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const cfg = configs.find(c => c.id === id);
    if (!cfg) return { success: false, latencyMs: 0, message: "Config not found" };
    return { success: true, latencyMs: Math.floor(Math.random() * 200) + 50, message: `Successfully connected to ${cfg.destination} at ${cfg.endpoint}` };
  }
}

export const logShippingService = new LogShippingService();
