export interface RateLimitEntry {
  endpoint: string;
  method: string;
  limit: number;
  window: number;
  currentUsage: number;
  remaining: number;
  resetAt: Date;
  blocked: number;
}

export interface RateLimitConfig {
  endpoint: string;
  method: string;
  limit: number;
  windowSeconds: number;
  enabled: boolean;
}

class RateLimitDashboardService {
  private configs: Map<string, RateLimitConfig> = new Map();
  private usage: Map<string, { count: number; blocked: number; resetAt: Date }> = new Map();

  setConfig(config: RateLimitConfig): RateLimitConfig {
    const key = `${config.method}:${config.endpoint}`;
    this.configs.set(key, config);
    return config;
  }

  getConfigs(): RateLimitConfig[] {
    return Array.from(this.configs.values());
  }

  deleteConfig(method: string, endpoint: string): boolean {
    return this.configs.delete(`${method}:${endpoint}`);
  }

  recordRequest(method: string, endpoint: string): { allowed: boolean; remaining: number } {
    const key = `${method}:${endpoint}`;
    const config = this.configs.get(key);
    if (!config || !config.enabled) return { allowed: true, remaining: -1 };
    let entry = this.usage.get(key);
    const now = new Date();
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, blocked: 0, resetAt: new Date(now.getTime() + config.windowSeconds * 1000) };
      this.usage.set(key, entry);
    }
    entry.count++;
    if (entry.count > config.limit) { entry.blocked++; return { allowed: false, remaining: 0 }; }
    return { allowed: true, remaining: config.limit - entry.count };
  }

  getDashboard(): RateLimitEntry[] {
    const entries: RateLimitEntry[] = [];
    for (const [key, config] of this.configs) {
      const usage = this.usage.get(key);
      entries.push({
        endpoint: config.endpoint, method: config.method,
        limit: config.limit, window: config.windowSeconds,
        currentUsage: usage?.count || 0, remaining: Math.max(0, config.limit - (usage?.count || 0)),
        resetAt: usage?.resetAt || new Date(), blocked: usage?.blocked || 0,
      });
    }
    return entries;
  }

  getMetrics(): { totalConfigs: number; totalBlocked: number; totalRequests: number } {
    let totalBlocked = 0, totalRequests = 0;
    for (const u of this.usage.values()) { totalBlocked += u.blocked; totalRequests += u.count; }
    return { totalConfigs: this.configs.size, totalBlocked, totalRequests };
  }
}

export const rateLimitDashboardService = new RateLimitDashboardService();
