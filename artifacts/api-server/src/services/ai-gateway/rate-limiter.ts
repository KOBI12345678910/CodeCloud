import type { Provider } from "./registry";

interface Bucket { tokens: number; lastRefill: number; capacity: number; refillPerSec: number; }

const PER_USER_MODEL_CAPACITY = 60;
const PER_USER_MODEL_REFILL = 1;
const PER_PROVIDER_CONCURRENCY: Record<Provider, number> = {
  openai: 20, anthropic: 20, google: 20, xai: 10, deepseek: 20,
  meta: 30, mistral: 20, qwen: 20, cohere: 10, ollama: 100,
};

class RateLimiter {
  private buckets: Map<string, Bucket> = new Map();
  private inFlight: Map<Provider, number> = new Map();

  private bucket(key: string, capacity: number, refillPerSec: number): Bucket {
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: capacity, lastRefill: Date.now(), capacity, refillPerSec };
      this.buckets.set(key, b);
    }
    const now = Date.now();
    const elapsed = (now - b.lastRefill) / 1000;
    b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refillPerSec);
    b.lastRefill = now;
    return b;
  }

  tryConsume(userId: string, modelId: string): { ok: true } | { ok: false; retryAfterMs: number; reason: string } {
    const key = `${userId}:${modelId}`;
    const b = this.bucket(key, PER_USER_MODEL_CAPACITY, PER_USER_MODEL_REFILL);
    if (b.tokens >= 1) { b.tokens -= 1; return { ok: true }; }
    const retry = Math.ceil((1 - b.tokens) / b.refillPerSec * 1000);
    return { ok: false, retryAfterMs: retry, reason: "Per-user model rate limit exceeded" };
  }

  acquire(provider: Provider): { ok: boolean; current: number; max: number } {
    const cur = this.inFlight.get(provider) ?? 0;
    const max = PER_PROVIDER_CONCURRENCY[provider] ?? 10;
    if (cur >= max) return { ok: false, current: cur, max };
    this.inFlight.set(provider, cur + 1);
    return { ok: true, current: cur + 1, max };
  }

  release(provider: Provider): void {
    const cur = this.inFlight.get(provider) ?? 0;
    this.inFlight.set(provider, Math.max(0, cur - 1));
  }

  status(): { buckets: Array<{ key: string; tokens: number; capacity: number }>; inFlight: Record<string, number> } {
    return {
      buckets: Array.from(this.buckets.entries()).map(([key, b]) => ({ key, tokens: Math.floor(b.tokens), capacity: b.capacity })),
      inFlight: Object.fromEntries(this.inFlight),
    };
  }
}

export const rateLimiter = new RateLimiter();
