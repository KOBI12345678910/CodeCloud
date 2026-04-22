export interface DedupEntry {
  idempotencyKey: string;
  requestHash: string;
  response: { status: number; body: any };
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
}

export interface DedupMetrics {
  totalRequests: number;
  duplicatesDetected: number;
  dedupRate: number;
  cacheSize: number;
  avgHitsPerKey: number;
}

class RequestDedupService {
  private cache: Map<string, DedupEntry> = new Map();
  private totalRequests = 0;
  private duplicatesDetected = 0;

  check(idempotencyKey: string, requestHash: string): DedupEntry | null {
    this.totalRequests++;
    this.cleanup();

    const entry = this.cache.get(idempotencyKey);
    if (entry && entry.expiresAt > new Date()) {
      entry.hitCount++;
      this.duplicatesDetected++;
      return entry;
    }

    if (entry && entry.requestHash !== requestHash) {
      this.cache.delete(idempotencyKey);
    }

    return null;
  }

  store(idempotencyKey: string, requestHash: string, status: number, body: any, ttlSeconds: number = 300): DedupEntry {
    const entry: DedupEntry = {
      idempotencyKey, requestHash,
      response: { status, body },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      hitCount: 0,
    };
    this.cache.set(idempotencyKey, entry);
    return entry;
  }

  get(key: string): DedupEntry | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt <= new Date()) return null;
    return entry;
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  getMetrics(): DedupMetrics {
    this.cleanup();
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hitCount, 0);
    return {
      totalRequests: this.totalRequests,
      duplicatesDetected: this.duplicatesDetected,
      dedupRate: this.totalRequests > 0 ? this.duplicatesDetected / this.totalRequests : 0,
      cacheSize: this.cache.size,
      avgHitsPerKey: entries.length > 0 ? totalHits / entries.length : 0,
    };
  }

  flush(): number {
    const count = this.cache.size;
    this.cache.clear();
    return count;
  }

  private cleanup(): void {
    const now = new Date();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
  }

  generateHash(method: string, path: string, body: any): string {
    const str = `${method}:${path}:${JSON.stringify(body || {})}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return `hash-${Math.abs(hash).toString(36)}`;
  }
}

export const requestDedupService = new RequestDedupService();
