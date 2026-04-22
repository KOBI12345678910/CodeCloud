export type Provider =
  | "openai" | "anthropic" | "google" | "xai" | "deepseek"
  | "meta" | "mistral" | "qwen" | "cohere" | "ollama";

export type Tier = "premium" | "standard" | "economy" | "free";

export type TaskType = "code" | "content" | "math" | "vision" | "reasoning" | "general";

export interface ModelDef {
  id: string;
  label: string;
  provider: Provider;
  apiModel: string;
  tier: Tier;
  contextWindow: number;
  supportsVision: boolean;
  supportsTools: boolean;
  inputPer1k: number;
  outputPer1k: number;
  fallbackChain: string[];
  enabled: boolean;
  qualityScore: number;
  avgLatencyMs: number;
  strengths: TaskType[];
  description: string;
}

const DEFAULT_MODELS: ModelDef[] = [
  { id: "gpt-5", label: "GPT-5", provider: "openai", apiModel: "gpt-5", tier: "premium", contextWindow: 256000, supportsVision: true, supportsTools: true, inputPer1k: 0.005, outputPer1k: 0.015, fallbackChain: ["gpt-4o", "claude-opus-4-5"], enabled: true, qualityScore: 96, avgLatencyMs: 2400, strengths: ["content", "reasoning", "general"], description: "OpenAI flagship — best general reasoning + writing." },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai", apiModel: "gpt-4o", tier: "premium", contextWindow: 128000, supportsVision: true, supportsTools: true, inputPer1k: 0.0025, outputPer1k: 0.01, fallbackChain: ["claude-sonnet-4-5", "gemini-2.5-pro"], enabled: true, qualityScore: 92, avgLatencyMs: 1600, strengths: ["vision", "content", "general"], description: "Fast multimodal." },
  { id: "claude-opus-4-5", label: "Claude Opus 4.5", provider: "anthropic", apiModel: "claude-opus-4-5", tier: "premium", contextWindow: 200000, supportsVision: true, supportsTools: true, inputPer1k: 0.015, outputPer1k: 0.075, fallbackChain: ["claude-sonnet-4-5", "gpt-5"], enabled: true, qualityScore: 97, avgLatencyMs: 3200, strengths: ["reasoning", "code", "vision"], description: "Anthropic's deepest reasoner — judge default." },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "anthropic", apiModel: "claude-sonnet-4-6", tier: "standard", contextWindow: 200000, supportsVision: true, supportsTools: true, inputPer1k: 0.003, outputPer1k: 0.015, fallbackChain: ["gpt-4o", "gemini-2.5-pro"], enabled: true, qualityScore: 94, avgLatencyMs: 1400, strengths: ["code", "general"], description: "Best coding assistant — balanced." },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "google", apiModel: "gemini-2.5-pro", tier: "standard", contextWindow: 1000000, supportsVision: true, supportsTools: true, inputPer1k: 0.00125, outputPer1k: 0.005, fallbackChain: ["gpt-4o", "claude-sonnet-4-5"], enabled: true, qualityScore: 91, avgLatencyMs: 1700, strengths: ["math", "reasoning", "vision"], description: "Massive context, strong math." },
  { id: "grok-4", label: "Grok 4", provider: "xai", apiModel: "grok-4", tier: "premium", contextWindow: 256000, supportsVision: true, supportsTools: true, inputPer1k: 0.005, outputPer1k: 0.015, fallbackChain: ["gpt-5", "claude-opus-4-5"], enabled: true, qualityScore: 90, avgLatencyMs: 2100, strengths: ["reasoning", "general"], description: "xAI realtime-aware reasoner." },
  { id: "deepseek-v3", label: "DeepSeek V3", provider: "deepseek", apiModel: "deepseek-chat", tier: "economy", contextWindow: 128000, supportsVision: false, supportsTools: true, inputPer1k: 0.00027, outputPer1k: 0.0011, fallbackChain: ["qwen-2-5", "llama-4"], enabled: true, qualityScore: 87, avgLatencyMs: 1500, strengths: ["code", "math"], description: "Cheap & strong on code." },
  { id: "llama-4", label: "Llama 4 (Groq)", provider: "meta", apiModel: "llama-4-405b", tier: "economy", contextWindow: 128000, supportsVision: false, supportsTools: false, inputPer1k: 0.00059, outputPer1k: 0.00079, fallbackChain: ["mistral-large", "deepseek-v3"], enabled: true, qualityScore: 85, avgLatencyMs: 600, strengths: ["general", "content"], description: "Open weights via fast inference." },
  { id: "mistral-large", label: "Mistral Large", provider: "mistral", apiModel: "mistral-large-latest", tier: "standard", contextWindow: 128000, supportsVision: false, supportsTools: true, inputPer1k: 0.002, outputPer1k: 0.006, fallbackChain: ["llama-4", "deepseek-v3"], enabled: true, qualityScore: 86, avgLatencyMs: 1300, strengths: ["content", "general"], description: "European, strong multilingual." },
  { id: "qwen-2-5", label: "Qwen 2.5 72B", provider: "qwen", apiModel: "qwen2.5-72b-instruct", tier: "economy", contextWindow: 128000, supportsVision: false, supportsTools: true, inputPer1k: 0.0004, outputPer1k: 0.0012, fallbackChain: ["deepseek-v3", "llama-4"], enabled: true, qualityScore: 84, avgLatencyMs: 1200, strengths: ["math", "code"], description: "Alibaba's frontier open model." },
  { id: "command-r-plus", label: "Cohere Command R+", provider: "cohere", apiModel: "command-r-plus", tier: "standard", contextWindow: 128000, supportsVision: false, supportsTools: true, inputPer1k: 0.0025, outputPer1k: 0.01, fallbackChain: ["mistral-large", "claude-sonnet-4-5"], enabled: true, qualityScore: 85, avgLatencyMs: 1500, strengths: ["content", "general"], description: "RAG-tuned, citations-friendly." },
  { id: "ollama-local", label: "Ollama (Local)", provider: "ollama", apiModel: "llama3.1:8b", tier: "free", contextWindow: 32000, supportsVision: false, supportsTools: false, inputPer1k: 0, outputPer1k: 0, fallbackChain: [], enabled: true, qualityScore: 70, avgLatencyMs: 800, strengths: ["general"], description: "Free, offline. No data leaves your machine." },
];

import { db } from "@workspace/db";
import { aiModelOverridesTable, aiRegistryAuditTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type OverridePatch = Partial<Pick<ModelDef, "enabled" | "inputPer1k" | "outputPer1k" | "qualityScore" | "fallbackChain">>;

class ModelRegistry {
  private base: Map<string, ModelDef> = new Map(DEFAULT_MODELS.map(m => [m.id, { ...m }]));
  private models: Map<string, ModelDef> = new Map(DEFAULT_MODELS.map(m => [m.id, { ...m }]));
  private councilMargin = 0.15;
  private judgeModelId = "claude-opus-4-5";
  private judgeFallback = "gpt-5";
  private version = 1;
  private preloaded = false;
  private preloadPromise: Promise<void> | null = null;

  async preload(): Promise<void> {
    if (this.preloaded) return;
    if (this.preloadPromise) { await this.preloadPromise; return; }
    this.preloadPromise = (async () => {
      try {
        const rows = await db.select().from(aiModelOverridesTable);
        for (const r of rows) this.applyOverride(r.modelId, {
          enabled: r.enabled ?? undefined,
          inputPer1k: r.inputPer1k ?? undefined,
          outputPer1k: r.outputPer1k ?? undefined,
          qualityScore: r.qualityScore ?? undefined,
          fallbackChain: (r.fallbackChain as string[] | null) ?? undefined,
        });
        this.preloaded = true;
      } catch (e) {
        // If DB unreachable, fall back to in-memory defaults but still mark preload done
        // so the app can serve. Logged for visibility.
        console.error("[ai-gateway] registry preload failed, using defaults:", e);
        this.preloaded = true;
      }
    })();
    await this.preloadPromise;
  }

  private applyOverride(id: string, patch: OverridePatch): void {
    const baseDef = this.base.get(id);
    if (!baseDef) return;
    const next: ModelDef = { ...baseDef };
    if (patch.enabled !== undefined) next.enabled = patch.enabled;
    if (patch.inputPer1k !== undefined) next.inputPer1k = patch.inputPer1k;
    if (patch.outputPer1k !== undefined) next.outputPer1k = patch.outputPer1k;
    if (patch.qualityScore !== undefined) next.qualityScore = patch.qualityScore;
    if (patch.fallbackChain !== undefined) next.fallbackChain = patch.fallbackChain;
    this.models.set(id, next);
  }

  list(): ModelDef[] { return Array.from(this.models.values()); }
  enabled(): ModelDef[] { return this.list().filter(m => m.enabled); }
  get(id: string): ModelDef | undefined { return this.models.get(id); }
  byProvider(p: Provider): ModelDef[] { return this.list().filter(m => m.provider === p); }
  byTier(t: Tier): ModelDef[] { return this.list().filter(m => m.tier === t); }

  async update(id: string, patch: OverridePatch, actorId: string | null, note?: string): Promise<ModelDef | undefined> {
    await this.preload();
    const before = this.models.get(id);
    if (!before) return undefined;
    const cleaned: OverridePatch = {};
    if (patch.enabled !== undefined) cleaned.enabled = !!patch.enabled;
    if (patch.inputPer1k !== undefined && Number.isFinite(patch.inputPer1k)) cleaned.inputPer1k = Math.max(0, Number(patch.inputPer1k));
    if (patch.outputPer1k !== undefined && Number.isFinite(patch.outputPer1k)) cleaned.outputPer1k = Math.max(0, Number(patch.outputPer1k));
    if (patch.qualityScore !== undefined && Number.isFinite(patch.qualityScore)) cleaned.qualityScore = Math.max(0, Math.min(100, Math.round(Number(patch.qualityScore))));
    if (patch.fallbackChain !== undefined && Array.isArray(patch.fallbackChain)) cleaned.fallbackChain = patch.fallbackChain.filter(x => typeof x === "string");
    this.applyOverride(id, cleaned);
    const after = this.models.get(id)!;
    this.version++;
    try {
      await db.insert(aiModelOverridesTable).values({
        modelId: id,
        enabled: cleaned.enabled ?? null,
        inputPer1k: cleaned.inputPer1k ?? null,
        outputPer1k: cleaned.outputPer1k ?? null,
        qualityScore: cleaned.qualityScore ?? null,
        fallbackChain: cleaned.fallbackChain ?? null,
        updatedBy: actorId,
      }).onConflictDoUpdate({
        target: aiModelOverridesTable.modelId,
        set: {
          enabled: cleaned.enabled ?? null,
          inputPer1k: cleaned.inputPer1k ?? null,
          outputPer1k: cleaned.outputPer1k ?? null,
          qualityScore: cleaned.qualityScore ?? null,
          fallbackChain: cleaned.fallbackChain ?? null,
          updatedBy: actorId,
        },
      });
      await db.insert(aiRegistryAuditTable).values({
        modelId: id, actorId, patch: cleaned as Record<string, unknown>,
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        version: this.version, note: note ?? null,
      });
    } catch (e) {
      console.error("[ai-gateway] registry persist failed:", e);
    }
    return after;
  }
  getVersion(): number { return this.version; }
  async auditLog(modelId?: string, limit = 50): Promise<unknown[]> {
    try {
      const q = db.select().from(aiRegistryAuditTable);
      const rows = modelId ? await q.where(eq(aiRegistryAuditTable.modelId, modelId)).limit(limit) : await q.limit(limit);
      return rows;
    } catch { return []; }
  }
  getCouncilMargin(): number { return this.councilMargin; }
  setCouncilMargin(v: number): void { this.councilMargin = Math.max(0, Math.min(1, v)); this.version++; }
  getJudgeModelId(): string { return this.judgeModelId; }
  getJudgeFallbackId(): string { return this.judgeFallback; }
  setJudge(primary: string, fallback?: string): void {
    if (this.models.has(primary)) this.judgeModelId = primary;
    if (fallback && this.models.has(fallback)) this.judgeFallback = fallback;
    this.version++;
  }

  groupedByTier(): Record<Tier, ModelDef[]> {
    const out: Record<Tier, ModelDef[]> = { premium: [], standard: [], economy: [], free: [] };
    for (const m of this.list()) out[m.tier].push(m);
    return out;
  }
}

export const modelRegistry = new ModelRegistry();
