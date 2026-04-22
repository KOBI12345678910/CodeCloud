export type Provider =
  | "openai" | "anthropic" | "google" | "xai" | "deepseek"
  | "meta" | "mistral" | "qwen" | "cohere" | "ollama"
  | "perplexity" | "ai21" | "together" | "fireworks" | "cerebras"
  | "inflection" | "zhipu" | "minimax" | "moonshot" | "baichuan"
  | "yi" | "sambanova" | "nvidia" | "amazon" | "azure";

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
  adapterReady: boolean;
}

type ModelDefInput = Omit<ModelDef, "adapterReady"> & { adapterReady?: boolean };

const DEFAULT_MODELS: ModelDefInput[] = [
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

  { id: "o4-mini", label: "OpenAI o4-mini", provider: "openai", apiModel: "o4-mini", tier: "standard", contextWindow: 200000, supportsVision: true, supportsTools: true, inputPer1k: 0.0011, outputPer1k: 0.0044, fallbackChain: ["gpt-4o", "claude-sonnet-4-5"], enabled: true, qualityScore: 93, avgLatencyMs: 4500, strengths: ["reasoning", "math", "code"], description: "OpenAI reasoning specialist — deep thinking." },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai", apiModel: "gpt-4o-mini", tier: "economy", contextWindow: 128000, supportsVision: true, supportsTools: true, inputPer1k: 0.00015, outputPer1k: 0.0006, fallbackChain: ["deepseek-v3", "qwen-2-5"], enabled: true, qualityScore: 82, avgLatencyMs: 700, strengths: ["general", "content"], description: "Cheapest OpenAI with vision." },
  { id: "claude-haiku-3-5", label: "Claude 3.5 Haiku", provider: "anthropic", apiModel: "claude-3-5-haiku-20241022", tier: "economy", contextWindow: 200000, supportsVision: true, supportsTools: true, inputPer1k: 0.0008, outputPer1k: 0.004, fallbackChain: ["gpt-4o-mini", "deepseek-v3"], enabled: true, qualityScore: 80, avgLatencyMs: 500, strengths: ["code", "general"], description: "Fastest Anthropic — great for simple tasks." },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "google", apiModel: "gemini-2.5-flash-preview", tier: "economy", contextWindow: 1000000, supportsVision: true, supportsTools: true, inputPer1k: 0.000075, outputPer1k: 0.0003, fallbackChain: ["gpt-4o-mini", "deepseek-v3"], enabled: true, qualityScore: 83, avgLatencyMs: 400, strengths: ["general", "math", "vision"], description: "Google's ultra-cheap 1M context model." },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "google", apiModel: "gemini-2.0-flash", tier: "economy", contextWindow: 1000000, supportsVision: true, supportsTools: true, inputPer1k: 0.0001, outputPer1k: 0.0004, fallbackChain: ["gemini-2.5-flash", "gpt-4o-mini"], enabled: true, qualityScore: 79, avgLatencyMs: 350, strengths: ["general", "vision"], description: "Previous gen Flash — still very fast." },

  { id: "perplexity-sonar-pro", label: "Perplexity Sonar Pro", provider: "perplexity", apiModel: "sonar-pro", tier: "premium", contextWindow: 200000, supportsVision: false, supportsTools: true, inputPer1k: 0.003, outputPer1k: 0.015, fallbackChain: ["gpt-4o", "claude-sonnet-4-5"], enabled: true, qualityScore: 88, avgLatencyMs: 2500, strengths: ["reasoning", "general"], description: "Live web search + reasoning — real-time knowledge." },
  { id: "perplexity-sonar", label: "Perplexity Sonar", provider: "perplexity", apiModel: "sonar", tier: "standard", contextWindow: 128000, supportsVision: false, supportsTools: true, inputPer1k: 0.001, outputPer1k: 0.001, fallbackChain: ["deepseek-v3", "gpt-4o-mini"], enabled: true, qualityScore: 82, avgLatencyMs: 1800, strengths: ["general", "content"], description: "Web-grounded answers — cheap." },

  { id: "ai21-jamba-1-5-large", label: "AI21 Jamba 1.5 Large", provider: "ai21", apiModel: "jamba-1.5-large", tier: "standard", contextWindow: 256000, supportsVision: false, supportsTools: true, inputPer1k: 0.002, outputPer1k: 0.008, fallbackChain: ["mistral-large", "command-r-plus"], enabled: true, qualityScore: 83, avgLatencyMs: 1400, strengths: ["content", "general"], description: "Hybrid SSM/Transformer — fast for long context." },

  { id: "deepseek-r1", label: "DeepSeek R1", provider: "deepseek", apiModel: "deepseek-reasoner", tier: "economy", contextWindow: 128000, supportsVision: false, supportsTools: false, inputPer1k: 0.00055, outputPer1k: 0.0022, fallbackChain: ["deepseek-v3", "qwen-2-5"], enabled: true, qualityScore: 90, avgLatencyMs: 5000, strengths: ["math", "reasoning", "code"], description: "Open reasoning model — rivals o1 at fraction of cost." },

  { id: "together-llama-3.3-70b", label: "Llama 3.3 70B (Together)", provider: "together", apiModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", tier: "economy", contextWindow: 128000, supportsVision: false, supportsTools: true, inputPer1k: 0.00054, outputPer1k: 0.00054, fallbackChain: ["llama-4", "deepseek-v3"], enabled: true, qualityScore: 84, avgLatencyMs: 500, strengths: ["general", "code"], description: "Open Llama via Together — blazing fast inference." },
  { id: "together-qwen-qwq-32b", label: "QwQ 32B (Together)", provider: "together", apiModel: "Qwen/QwQ-32B", tier: "economy", contextWindow: 128000, supportsVision: false, supportsTools: false, inputPer1k: 0.0003, outputPer1k: 0.0003, fallbackChain: ["deepseek-r1", "deepseek-v3"], enabled: true, qualityScore: 85, avgLatencyMs: 3000, strengths: ["math", "reasoning"], description: "Open reasoning model from Qwen — dirt cheap." },

  { id: "fireworks-llama-3.1-405b", label: "Llama 3.1 405B (Fireworks)", provider: "fireworks", apiModel: "accounts/fireworks/models/llama-v3p1-405b-instruct", tier: "standard", contextWindow: 128000, supportsVision: false, supportsTools: true, inputPer1k: 0.003, outputPer1k: 0.003, fallbackChain: ["llama-4", "together-llama-3.3-70b"], enabled: true, qualityScore: 88, avgLatencyMs: 900, strengths: ["code", "general", "reasoning"], description: "Largest open model — Fireworks fast inference." },

  { id: "cerebras-llama-3.3-70b", label: "Llama 3.3 70B (Cerebras)", provider: "cerebras", apiModel: "llama-3.3-70b", tier: "economy", contextWindow: 128000, supportsVision: false, supportsTools: false, inputPer1k: 0.00085, outputPer1k: 0.0012, fallbackChain: ["together-llama-3.3-70b", "deepseek-v3"], enabled: true, qualityScore: 84, avgLatencyMs: 200, strengths: ["general", "code"], description: "Cerebras wafer-scale chip — world's fastest inference." },

  { id: "inflection-pi", label: "Inflection Pi", provider: "inflection", apiModel: "inflection-3-pi", tier: "standard", contextWindow: 128000, supportsVision: false, supportsTools: false, inputPer1k: 0.0025, outputPer1k: 0.01, fallbackChain: ["gpt-4o-mini", "mistral-large"], enabled: true, qualityScore: 81, avgLatencyMs: 1100, strengths: ["content", "general"], description: "Conversational AI — great for chat UX." },

  { id: "glm-4-plus", label: "GLM-4-Plus (Zhipu)", provider: "zhipu", apiModel: "glm-4-plus", tier: "standard", contextWindow: 128000, supportsVision: true, supportsTools: true, inputPer1k: 0.0014, outputPer1k: 0.0014, fallbackChain: ["qwen-2-5", "deepseek-v3"], enabled: true, qualityScore: 83, avgLatencyMs: 1200, strengths: ["general", "vision", "code"], description: "Chinese frontier model — strong multilingual." },

  { id: "minimax-abab-7", label: "MiniMax abab-7", provider: "minimax", apiModel: "abab7-chat", tier: "economy", contextWindow: 245000, supportsVision: false, supportsTools: true, inputPer1k: 0.0003, outputPer1k: 0.0003, fallbackChain: ["qwen-2-5", "deepseek-v3"], enabled: true, qualityScore: 80, avgLatencyMs: 1000, strengths: ["content", "general"], description: "Ultra-long context, very cheap — Chinese origin." },

  { id: "moonshot-v1-128k", label: "Moonshot Kimi", provider: "moonshot", apiModel: "moonshot-v1-128k", tier: "economy", contextWindow: 128000, supportsVision: false, supportsTools: true, inputPer1k: 0.0008, outputPer1k: 0.0008, fallbackChain: ["deepseek-v3", "qwen-2-5"], enabled: true, qualityScore: 79, avgLatencyMs: 1300, strengths: ["content", "general"], description: "Long-context Chinese model — great at documents." },

  { id: "yi-large", label: "Yi-Large (01.AI)", provider: "yi", apiModel: "yi-large", tier: "standard", contextWindow: 200000, supportsVision: true, supportsTools: true, inputPer1k: 0.003, outputPer1k: 0.003, fallbackChain: ["qwen-2-5", "glm-4-plus"], enabled: true, qualityScore: 84, avgLatencyMs: 1400, strengths: ["general", "vision", "code"], description: "Kai-Fu Lee's frontier — strong reasoning." },

  { id: "sambanova-llama-405b", label: "Llama 3.1 405B (SambaNova)", provider: "sambanova", apiModel: "Meta-Llama-3.1-405B-Instruct", tier: "standard", contextWindow: 128000, supportsVision: false, supportsTools: false, inputPer1k: 0.002, outputPer1k: 0.003, fallbackChain: ["fireworks-llama-3.1-405b", "llama-4"], enabled: true, qualityScore: 88, avgLatencyMs: 400, strengths: ["code", "reasoning", "general"], description: "SambaNova RDU chip — ultra-fast 405B serving." },

  { id: "nvidia-nemotron-70b", label: "Nemotron 70B (NVIDIA)", provider: "nvidia", apiModel: "nvidia/llama-3.1-nemotron-70b-instruct", tier: "standard", contextWindow: 128000, supportsVision: false, supportsTools: true, inputPer1k: 0.0013, outputPer1k: 0.0013, fallbackChain: ["llama-4", "together-llama-3.3-70b"], enabled: true, qualityScore: 86, avgLatencyMs: 600, strengths: ["code", "reasoning"], description: "NVIDIA fine-tuned Llama — strong at instruction following." },

  { id: "amazon-nova-pro", label: "Amazon Nova Pro", provider: "amazon", apiModel: "amazon.nova-pro-v1:0", tier: "standard", contextWindow: 300000, supportsVision: true, supportsTools: true, inputPer1k: 0.0008, outputPer1k: 0.0032, fallbackChain: ["gpt-4o-mini", "gemini-2.5-flash"], enabled: true, qualityScore: 82, avgLatencyMs: 1200, strengths: ["general", "vision", "content"], description: "AWS proprietary — deeply integrated with AWS." },
  { id: "amazon-nova-lite", label: "Amazon Nova Lite", provider: "amazon", apiModel: "amazon.nova-lite-v1:0", tier: "economy", contextWindow: 300000, supportsVision: true, supportsTools: true, inputPer1k: 0.00006, outputPer1k: 0.00024, fallbackChain: ["gemini-2.5-flash", "gpt-4o-mini"], enabled: true, qualityScore: 75, avgLatencyMs: 500, strengths: ["general", "vision"], description: "AWS cheapest — great for high-volume." },

  { id: "grok-3-mini", label: "Grok 3 Mini", provider: "xai", apiModel: "grok-3-mini", tier: "economy", contextWindow: 128000, supportsVision: false, supportsTools: true, inputPer1k: 0.0003, outputPer1k: 0.0005, fallbackChain: ["deepseek-v3", "gpt-4o-mini"], enabled: true, qualityScore: 81, avgLatencyMs: 700, strengths: ["general", "reasoning"], description: "xAI budget — realtime data access." },

  { id: "mistral-small", label: "Mistral Small", provider: "mistral", apiModel: "mistral-small-latest", tier: "economy", contextWindow: 32000, supportsVision: false, supportsTools: true, inputPer1k: 0.0001, outputPer1k: 0.0003, fallbackChain: ["gpt-4o-mini", "deepseek-v3"], enabled: true, qualityScore: 77, avgLatencyMs: 400, strengths: ["general", "code"], description: "Mistral budget — EU data residency." },
  { id: "mistral-codestral", label: "Codestral", provider: "mistral", apiModel: "codestral-latest", tier: "standard", contextWindow: 32000, supportsVision: false, supportsTools: false, inputPer1k: 0.001, outputPer1k: 0.003, fallbackChain: ["deepseek-v3", "claude-sonnet-4-5"], enabled: true, qualityScore: 88, avgLatencyMs: 600, strengths: ["code"], description: "Mistral's code specialist — top-tier FIM + completion." },

  { id: "cohere-command-r7b", label: "Cohere Command R7B", provider: "cohere", apiModel: "command-r7b-12-2024", tier: "free", contextWindow: 128000, supportsVision: false, supportsTools: true, inputPer1k: 0.0000375, outputPer1k: 0.00015, fallbackChain: ["ollama-local"], enabled: true, qualityScore: 72, avgLatencyMs: 300, strengths: ["general"], description: "Nearly free — great for embeddings & classification." },
];

import { db } from "@workspace/db";
import { aiModelOverridesTable, aiRegistryAuditTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type OverridePatch = Partial<Pick<ModelDef, "enabled" | "inputPer1k" | "outputPer1k" | "qualityScore" | "fallbackChain">>;

const ADAPTER_READY_PROVIDERS: Set<string> = new Set([
  "openai", "anthropic", "google", "xai", "deepseek",
  "meta", "mistral", "qwen", "cohere", "ollama",
]);

function enrichModel(m: ModelDefInput): ModelDef {
  return { ...m, adapterReady: m.adapterReady ?? ADAPTER_READY_PROVIDERS.has(m.provider) };
}

class ModelRegistry {
  private base: Map<string, ModelDef> = new Map(DEFAULT_MODELS.map(m => [m.id, enrichModel(m)]));
  private models: Map<string, ModelDef> = new Map(DEFAULT_MODELS.map(m => [m.id, enrichModel(m)]));
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
