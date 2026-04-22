interface CacheEntry {
  embedding: Float32Array;
  prompt: string;
  response: string;
  modelId: string;
  userId: string;
  projectId: string | null;
  createdAt: number;
}

const TTL_MS = 1000 * 60 * 60 * 24; // 24h
const SIM_THRESHOLD = 0.92;
const MAX_ENTRIES = 5000;

function hashEmbed(text: string, dim = 256): Float32Array {
  const v = new Float32Array(dim);
  const tokens = text.toLowerCase().match(/\w+/g) ?? [];
  for (const t of tokens) {
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    const idx = Math.abs(h) % dim;
    v[idx] += 1;
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) v[i] /= norm;
  return v;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

class SemanticCache {
  private entries: CacheEntry[] = [];
  private hits = 0;
  private misses = 0;

  embed(text: string): Float32Array { return hashEmbed(text); }

  lookup(prompt: string, modelId: string, userId: string, projectId: string | null): { hit: boolean; entry?: CacheEntry; similarity?: number } {
    const now = Date.now();
    this.entries = this.entries.filter(e => now - e.createdAt < TTL_MS);
    const target = hashEmbed(prompt);
    let best: { entry: CacheEntry; sim: number } | null = null;
    for (const e of this.entries) {
      if (e.modelId !== modelId || e.userId !== userId || e.projectId !== projectId) continue;
      const sim = cosine(target, e.embedding);
      if (sim > (best?.sim ?? 0)) best = { entry: e, sim };
    }
    if (best && best.sim >= SIM_THRESHOLD) {
      this.hits++;
      return { hit: true, entry: best.entry, similarity: best.sim };
    }
    this.misses++;
    return { hit: false };
  }

  store(prompt: string, response: string, modelId: string, userId: string, projectId: string | null): void {
    if (this.entries.length >= MAX_ENTRIES) this.entries.shift();
    this.entries.push({
      embedding: hashEmbed(prompt),
      prompt, response, modelId, userId, projectId,
      createdAt: Date.now(),
    });
  }

  stats(): { entries: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return { entries: this.entries.length, hits: this.hits, misses: this.misses, hitRate: total ? this.hits / total : 0 };
  }

  clear(): void { this.entries = []; this.hits = 0; this.misses = 0; }
}

export const semanticCache = new SemanticCache();
