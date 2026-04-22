interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number | null;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  windowMs: number;
}

class RedisCacheService {
  private store = new Map<string, CacheEntry>();
  private rateLimits = new Map<string, RateLimitEntry>();
  private stats = { hits: 0, misses: 0, sets: 0, deletes: 0, evictions: 0 };
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
    this.cleanupTimer = setInterval(() => this.evictExpired(), 60_000);
    console.log("[redis-cache] Connected (in-memory simulation)");
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.store.clear();
    this.rateLimits.clear();
    console.log("[redis-cache] Disconnected");
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    const ok = this.connected;
    return { ok, latencyMs: Date.now() - start };
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }
    this.stats.hits++;
    return entry.value as T;
  }

  async set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.stats.sets++;
    this.store.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
    });
  }

  async del(key: string): Promise<boolean> {
    this.stats.deletes++;
    return this.store.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }

  async flushAll(): Promise<void> {
    this.store.clear();
    this.rateLimits.clear();
  }

  async checkRateLimit(key: string, maxCount: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const entry = this.rateLimits.get(key);

    if (!entry || now - entry.windowStart > entry.windowMs) {
      this.rateLimits.set(key, { count: 1, windowStart: now, windowMs });
      return { allowed: true, remaining: maxCount - 1, resetAt: now + windowMs };
    }

    entry.count++;
    const allowed = entry.count <= maxCount;
    return {
      allowed,
      remaining: Math.max(0, maxCount - entry.count),
      resetAt: entry.windowStart + entry.windowMs,
    };
  }

  async cacheSession(sessionId: string, data: Record<string, unknown>): Promise<void> {
    await this.set(`session:${sessionId}`, data, 24 * 60 * 60 * 1000);
  }

  async getSession(sessionId: string): Promise<Record<string, unknown> | null> {
    return this.get<Record<string, unknown>>(`session:${sessionId}`);
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  async cacheProjectFileTree(projectId: string, tree: unknown): Promise<void> {
    await this.set(`filetree:${projectId}`, tree, 5 * 60 * 1000);
  }

  async getProjectFileTree(projectId: string): Promise<unknown | null> {
    return this.get(`filetree:${projectId}`);
  }

  async cacheAIResponse(promptHash: string, response: string, modelId: string): Promise<void> {
    await this.set(`ai:${modelId}:${promptHash}`, response, 60 * 60 * 1000);
  }

  async getAIResponse(promptHash: string, modelId: string): Promise<string | null> {
    return this.get<string>(`ai:${modelId}:${promptHash}`);
  }

  getStats(): {
    connected: boolean;
    entries: number;
    hits: number;
    misses: number;
    hitRate: number;
    sets: number;
    deletes: number;
    evictions: number;
    memoryUsageMb: number;
    rateLimitKeys: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    return {
      connected: this.connected,
      entries: this.store.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      evictions: this.stats.evictions,
      memoryUsageMb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      rateLimitKeys: this.rateLimits.size,
    };
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.store.delete(key);
        this.stats.evictions++;
      }
    }
    for (const [key, entry] of this.rateLimits) {
      if (now - entry.windowStart > entry.windowMs * 2) {
        this.rateLimits.delete(key);
      }
    }
  }
}

export const redisCache = new RedisCacheService();
