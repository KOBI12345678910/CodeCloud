export interface RateLimitRule {
  id: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "ALL";
  limitBy: "ip" | "user" | "apiKey";
  maxRequests: number;
  windowSeconds: number;
  burstLimit: number;
  customResponse: { statusCode: number; message: string } | null;
  enabled: boolean;
  createdAt: Date;
}

export interface RateLimitHit {
  ruleId: string;
  identifier: string;
  timestamp: Date;
  blocked: boolean;
  remaining: number;
}

export interface RateLimitAnalytics {
  ruleId: string;
  totalRequests: number;
  blockedRequests: number;
  uniqueIdentifiers: number;
  topOffenders: { identifier: string; count: number }[];
  hourlyDistribution: number[];
}

class DeployRateLimitService {
  private rules: Map<string, RateLimitRule> = new Map();
  private counters: Map<string, { count: number; windowStart: number }> = new Map();
  private hits: RateLimitHit[] = [];

  createRule(rule: Omit<RateLimitRule, "id" | "createdAt">): RateLimitRule {
    const id = `rl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: RateLimitRule = { ...rule, id, createdAt: new Date() };
    this.rules.set(id, entry);
    return entry;
  }

  getRules(): RateLimitRule[] {
    return Array.from(this.rules.values());
  }

  updateRule(id: string, updates: Partial<RateLimitRule>): RateLimitRule | null {
    const rule = this.rules.get(id);
    if (!rule) return null;
    Object.assign(rule, updates);
    return rule;
  }

  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  checkLimit(endpoint: string, method: string, identifier: string, limitBy: string): { allowed: boolean; remaining: number; retryAfter: number; rule: RateLimitRule | null } {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      if (rule.endpoint !== "*" && !endpoint.startsWith(rule.endpoint)) continue;
      if (rule.method !== "ALL" && rule.method !== method) continue;
      if (rule.limitBy !== limitBy) continue;

      const key = `${rule.id}:${identifier}`;
      const now = Date.now();
      let counter = this.counters.get(key);

      if (!counter || now - counter.windowStart > rule.windowSeconds * 1000) {
        counter = { count: 0, windowStart: now };
        this.counters.set(key, counter);
      }

      counter.count++;
      const blocked = counter.count > rule.maxRequests;
      const remaining = Math.max(0, rule.maxRequests - counter.count);
      const retryAfter = blocked ? Math.ceil((counter.windowStart + rule.windowSeconds * 1000 - now) / 1000) : 0;

      this.hits.push({ ruleId: rule.id, identifier, timestamp: new Date(), blocked, remaining });

      if (blocked) return { allowed: false, remaining: 0, retryAfter, rule };
      return { allowed: true, remaining, retryAfter: 0, rule };
    }
    return { allowed: true, remaining: -1, retryAfter: 0, rule: null };
  }

  getAnalytics(ruleId: string): RateLimitAnalytics {
    const ruleHits = this.hits.filter(h => h.ruleId === ruleId);
    const identifierCounts = new Map<string, number>();
    for (const h of ruleHits) {
      identifierCounts.set(h.identifier, (identifierCounts.get(h.identifier) || 0) + 1);
    }
    const topOffenders = Array.from(identifierCounts.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([identifier, count]) => ({ identifier, count }));

    const hourly = new Array(24).fill(0);
    for (const h of ruleHits) hourly[h.timestamp.getHours()]++;

    return {
      ruleId,
      totalRequests: ruleHits.length,
      blockedRequests: ruleHits.filter(h => h.blocked).length,
      uniqueIdentifiers: identifierCounts.size,
      topOffenders,
      hourlyDistribution: hourly,
    };
  }
}

export const deployRateLimitService = new DeployRateLimitService();
