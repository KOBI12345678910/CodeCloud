import { modelRegistry, type ModelDef, type Provider } from "./registry";
import { getAdapter, isProviderConfigured, type ChatMsg } from "./adapters";
import { circuitBreaker } from "./circuit-breaker";
import { rateLimiter } from "./rate-limiter";
import { semanticCache } from "./cache";
import { byokService } from "./byok";
import { classify, recommendations } from "./classifier";
import { usageTracker } from "./usage";
import { judgeCandidates, type CandidateAnswer, type JudgeResult } from "./judge";

function isModelAvailable(userId: string, model: ModelDef): boolean {
  return isProviderConfigured(model.provider) || byokService.has(userId, model.provider);
}

export interface CompleteOptions {
  userId: string;
  projectId?: string | null;
  modelId: string;
  messages: ChatMsg[];
  conversationId?: string | null;
  systemOverride?: string;
  noCache?: boolean;
  deadlineMs?: number;
}

export interface CompleteResult {
  modelId: string;
  label: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  cacheHit: boolean;
  byok: boolean;
  servedByFallback: boolean;
  servedBy: string;
  taskType: string;
}

const INFRA_MARGIN_PCT = 0.15;

function computeCost(model: ModelDef, inputTokens: number, outputTokens: number, byok: boolean): number {
  const tokenCost = (inputTokens / 1000) * model.inputPer1k + (outputTokens / 1000) * model.outputPer1k;
  if (byok) return tokenCost * INFRA_MARGIN_PCT;
  return tokenCost;
}

function buildPromptKey(messages: ChatMsg[]): string {
  return messages.map(m => `${m.role}:${m.content}`).join("\n");
}

async function callOnce(model: ModelDef, messages: ChatMsg[], userId: string, deadlineMs?: number): Promise<{ result: Awaited<ReturnType<ReturnType<typeof getAdapter>["complete"]>>; byok: boolean }> {
  const adapter = getAdapter(model.provider);
  await byokService.preload(userId);
  const byokKey = byokService.get(userId, model.provider);
  const acquired = rateLimiter.acquire(model.provider);
  if (!acquired.ok) throw new Error(`Provider ${model.provider} concurrency limit reached`);
  const ctrl = new AbortController();
  const timeout = deadlineMs ? setTimeout(() => ctrl.abort(), deadlineMs) : null;
  try {
    const result = await adapter.complete(model, messages, { apiKey: byokKey, signal: ctrl.signal, maxTokens: 4096 });
    return { result, byok: !!byokKey };
  } finally {
    if (timeout) clearTimeout(timeout);
    rateLimiter.release(model.provider);
  }
}

export async function complete(opts: CompleteOptions): Promise<CompleteResult> {
  const { userId, projectId = null, messages, deadlineMs } = opts;

  const pause = usageTracker.isPaused(userId);
  if (pause.paused) throw Object.assign(new Error(pause.reason ?? "Paused"), { code: "alert_paused", until: pause.until });

  const model = modelRegistry.get(opts.modelId);
  if (!model) throw Object.assign(new Error(`Unknown model: ${opts.modelId}`), { code: "unknown_model" });
  if (!model.enabled) throw Object.assign(new Error(`Model ${model.label} is disabled`), { code: "model_disabled" });
  await byokService.preload(userId);
  if (!isModelAvailable(userId, model)) {
    throw Object.assign(new Error(`${model.label} has no provider credential. Add a BYOK key in Settings → Multi-AI or have an admin set ${model.provider.toUpperCase()} env keys.`), { code: "provider_unavailable" });
  }

  const rl = rateLimiter.tryConsume(userId, model.id);
  if (!rl.ok) throw Object.assign(new Error(rl.reason), { code: "rate_limited", retryAfterMs: rl.retryAfterMs });

  const userPrompt = messages.filter(m => m.role === "user").map(m => m.content).join("\n");
  const taskType = classify(userPrompt);

  if (!opts.noCache) {
    const hit = semanticCache.lookup(buildPromptKey(messages), model.id, userId, projectId);
    if (hit.hit && hit.entry) {
      const ev = usageTracker.emit({
        userId, projectId, modelId: model.id, provider: model.provider, mode: "single",
        inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 5,
        cacheHit: true, byok: false, servedByFallback: false, taskType,
      });
      return {
        modelId: model.id, label: model.label, content: hit.entry.response,
        inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: ev.latencyMs,
        cacheHit: true, byok: false, servedByFallback: false, servedBy: model.id, taskType,
      };
    }
  }

  const chain: ModelDef[] = [model];
  for (const fid of model.fallbackChain) {
    const fm = modelRegistry.get(fid);
    if (fm && fm.enabled && isModelAvailable(userId, fm)) chain.push(fm);
  }

  let lastErr: Error | null = null;
  for (let i = 0; i < chain.length; i++) {
    const m = chain[i];
    if (circuitBreaker.isOpen(m.provider)) { lastErr = new Error(`${m.provider} circuit open`); continue; }
    try {
      const { result, byok } = await callOnce(m, messages, userId, deadlineMs);
      circuitBreaker.recordSuccess(m.provider);
      const cost = computeCost(m, result.inputTokens, result.outputTokens, byok);
      const servedByFallback = i > 0;
      semanticCache.store(buildPromptKey(messages), result.content, model.id, userId, projectId);
      // Attribute usage to the model that ACTUALLY served — keeps comparison
      // dashboards consistent between single-mode and council-mode.
      usageTracker.emit({
        userId, projectId, modelId: m.id, provider: m.provider, mode: "single",
        inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: cost, latencyMs: result.latencyMs,
        cacheHit: false, byok, servedByFallback, taskType,
      });
      return {
        modelId: model.id, label: model.label, content: result.content,
        inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: cost, latencyMs: result.latencyMs,
        cacheHit: false, byok, servedByFallback, servedBy: m.id, taskType,
      };
    } catch (e) {
      circuitBreaker.recordFailure(m.provider);
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw Object.assign(new Error(`All models in chain failed: ${lastErr?.message ?? "unknown"}`), { code: "chain_exhausted" });
}

export interface CouncilOptions {
  userId: string;
  projectId?: string | null;
  messages: ChatMsg[];
  modelIds?: string[];
  deadlineMs?: number;
}

export interface CouncilResult {
  runId: string;
  candidates: CandidateAnswer[];
  judge: JudgeResult;
  totalCostUsd: number;
  totalLatencyMs: number;
  taskType: string;
  margin: number;
}

interface CouncilRunRecord {
  runId: string;
  userId: string;
  candidateCosts: Map<string, number>;
  totalCostUsd: number;
  judgeCostUsd: number;
  margin: number;
  createdAt: number;
  promoted: boolean;
}

// Server-authoritative council run ledger. promote() must look up the run by id
// and recompute the refund from these values; the client must never be trusted
// to supply pricing fields.
const councilRuns = new Map<string, CouncilRunRecord>();
const COUNCIL_RUN_TTL_MS = 30 * 60 * 1000;

function gcCouncilRuns(): void {
  const cutoff = Date.now() - COUNCIL_RUN_TTL_MS;
  for (const [id, r] of councilRuns) if (r.createdAt < cutoff) councilRuns.delete(id);
}

export function getCouncilRun(runId: string): CouncilRunRecord | undefined {
  return councilRuns.get(runId);
}

export interface CouncilPromoteResult {
  ok: true;
  runId: string;
  winnerModelId: string;
  refundUsd: number;
  originalUsd: number;
  finalUsd: number;
}

export function promoteCouncilWinner(userId: string, runId: string, winnerModelId: string): CouncilPromoteResult {
  const run = councilRuns.get(runId);
  if (!run) throw Object.assign(new Error("Council run not found or expired"), { code: "council_run_not_found" });
  if (run.userId !== userId) throw Object.assign(new Error("Not your council run"), { code: "council_run_forbidden" });
  if (run.promoted) throw Object.assign(new Error("Council run already promoted"), { code: "council_already_promoted" });
  const winnerCost = run.candidateCosts.get(winnerModelId);
  if (winnerCost === undefined) throw Object.assign(new Error("Winner model was not part of this council run"), { code: "council_winner_invalid" });
  const refundUsd = Math.max(0, run.totalCostUsd - winnerCost);
  run.promoted = true;
  return { ok: true, runId, winnerModelId, refundUsd, originalUsd: run.totalCostUsd, finalUsd: winnerCost };
}

// Walk a single model's fallback chain (used by both single-mode and council candidates).
// Returns the call result + which model actually served the response and whether a fallback was used.
async function callWithFallback(model: ModelDef, messages: ChatMsg[], userId: string, deadlineMs?: number): Promise<{ result: Awaited<ReturnType<typeof callOnce>>["result"]; byok: boolean; servedBy: ModelDef; servedByFallback: boolean }> {
  const chain: ModelDef[] = [model];
  for (const fid of model.fallbackChain) {
    const fm = modelRegistry.get(fid);
    if (fm && fm.enabled && isModelAvailable(userId, fm)) chain.push(fm);
  }
  let lastErr: Error | null = null;
  for (let i = 0; i < chain.length; i++) {
    const m = chain[i];
    if (circuitBreaker.isOpen(m.provider)) { lastErr = new Error(`${m.provider} circuit open`); continue; }
    try {
      const { result, byok } = await callOnce(m, messages, userId, deadlineMs);
      circuitBreaker.recordSuccess(m.provider);
      return { result, byok, servedBy: m, servedByFallback: i > 0 };
    } catch (e) {
      circuitBreaker.recordFailure(m.provider);
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw Object.assign(new Error(`All fallbacks for ${model.id} failed: ${lastErr?.message ?? "unknown"}`), { code: "chain_exhausted" });
}

export async function runCouncil(opts: CouncilOptions): Promise<CouncilResult> {
  const { userId, projectId = null, messages, deadlineMs = 45_000 } = opts;
  const pause = usageTracker.isPaused(userId);
  if (pause.paused) throw Object.assign(new Error(pause.reason ?? "Paused"), { code: "alert_paused", until: pause.until });

  const userPrompt = messages.filter(m => m.role === "user").map(m => m.content).join("\n");
  const taskType = classify(userPrompt);

  await byokService.preload(userId);
  const allEnabled = modelRegistry.enabled().filter(m => m.provider !== "ollama");
  // Drop unavailable providers — council only fans out to models we can really call.
  const availableEnabled = allEnabled.filter(m => isModelAvailable(userId, m));
  const requested = opts.modelIds && opts.modelIds.length > 0 ? availableEnabled.filter(m => opts.modelIds!.includes(m.id)) : availableEnabled;
  const skipped = (opts.modelIds && opts.modelIds.length > 0 ? allEnabled.filter(m => opts.modelIds!.includes(m.id)) : allEnabled)
    .filter(m => !isModelAvailable(userId, m))
    .map(m => ({ modelId: m.id, label: m.label, content: "", inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0, ok: false as const, error: `${m.provider} not configured (no env key, no BYOK)` }));
  const selected = requested;
  if (selected.length === 0) throw Object.assign(new Error("No available models for council. Add BYOK keys in Settings → Multi-AI."), { code: "no_available_models" });

  const start = Date.now();
  // Run candidates without emitting usage yet — we want to attach the judge
  // rubric per candidate so the comparison dashboard can compute model-level
  // quality from real council runs. All candidates share the same wall-clock
  // budget; remaining time is propagated to each fallback attempt below.
  const remaining = (): number => Math.max(0, deadlineMs - (Date.now() - start));
  const pending = await Promise.allSettled(selected.map(async (m): Promise<CandidateAnswer> => {
    const rl = rateLimiter.tryConsume(userId, m.id);
    if (!rl.ok) return { modelId: m.id, label: m.label, content: "", inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0, ok: false, error: rl.reason };
    if (circuitBreaker.isOpen(m.provider)) return { modelId: m.id, label: m.label, content: "", inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0, ok: false, error: `${m.provider} circuit open` };
    try {
      const left = remaining();
      if (left <= 0) return { modelId: m.id, label: m.label, content: "", inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0, ok: false, error: "council deadline exceeded" };
      const { result, byok, servedBy, servedByFallback } = await callWithFallback(m, messages, userId, left);
      const cost = computeCost(servedBy, result.inputTokens, result.outputTokens, byok);
      return { modelId: m.id, label: m.label, content: result.content, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: cost, latencyMs: result.latencyMs, ok: true, byok, servedBy: servedBy.id, servedByFallback };
    } catch (e) {
      return { modelId: m.id, label: m.label, content: "", inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0, ok: false, error: e instanceof Error ? e.message : "Provider error" };
    }
  }));
  const candidates: CandidateAnswer[] = [
    ...pending.map((s, i) => s.status === "fulfilled" ? s.value : { modelId: selected[i].id, label: selected[i].label, content: "", inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0, ok: false, error: String(s.reason) }),
    ...skipped.map(s => ({ ...s, label: modelRegistry.get(s.modelId)?.label ?? s.modelId })),
  ];

  const judge = await judgeCandidates(userPrompt, candidates, userId);

  // Now emit one usage event per candidate WITH its rubric attached. We log
  // under the model that ACTUALLY served (c.servedBy) so the comparison
  // dashboard reflects real provider usage when fallbacks kicked in.
  for (const c of candidates) {
    if (!c.ok) continue;
    const requested = selected.find(s => s.id === c.modelId);
    if (!requested) continue;
    const servingId = c.servedBy ?? requested.id;
    const serving = modelRegistry.get(servingId) ?? requested;
    const rubric = judge.scores.find(s => s.modelId === c.modelId)?.rubric;
    usageTracker.emit({
      userId, projectId, modelId: serving.id, provider: serving.provider, mode: "council",
      inputTokens: c.inputTokens, outputTokens: c.outputTokens, costUsd: c.costUsd, latencyMs: c.latencyMs,
      cacheHit: false, byok: !!c.byok, servedByFallback: !!c.servedByFallback, taskType,
      rubric,
    });
  }

  const judgeModel = modelRegistry.get(judge.judgeModelId);
  if (judgeModel) {
    usageTracker.emit({
      userId, projectId, modelId: judge.judgeModelId, provider: judgeModel.provider, mode: "judge",
      inputTokens: 0, outputTokens: 0, costUsd: judge.judgeCostUsd, latencyMs: judge.judgeLatencyMs,
      cacheHit: false, byok: judge.judgeBYOK, servedByFallback: judge.fallbackUsed, taskType,
    });
  }

  const candidateCost = candidates.reduce((s, c) => s + c.costUsd, 0);
  const margin = (candidateCost + judge.judgeCostUsd) * modelRegistry.getCouncilMargin();
  const totalCostUsd = candidateCost + judge.judgeCostUsd + margin;
  // Emit the council margin as its own usage event so /usage totals + alert
  // checks match the displayed totalCostUsd. Without this the per-event sum
  // would systematically undercount real council billing.
  if (margin > 0) {
    usageTracker.emit({
      userId, projectId, modelId: "council-margin", provider: "openai", mode: "judge",
      inputTokens: 0, outputTokens: 0, costUsd: margin, latencyMs: 0,
      cacheHit: false, byok: false, servedByFallback: false, taskType,
    });
  }

  gcCouncilRuns();
  const runId = `cr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const candidateCosts = new Map<string, number>();
  for (const c of candidates) if (c.ok) candidateCosts.set(c.modelId, c.costUsd);
  councilRuns.set(runId, {
    runId, userId, candidateCosts,
    totalCostUsd, judgeCostUsd: judge.judgeCostUsd, margin,
    createdAt: Date.now(), promoted: false,
  });

  return { runId, candidates, judge, totalCostUsd, totalLatencyMs: Date.now() - start, taskType, margin };
}

export function recommend(userId: string, prompt: string): { taskType: string; recommendedModelId: string; reason: string } {
  const taskType = classify(prompt);
  const learned = recommendations.preferenceFor(userId, taskType);
  if (learned) {
    const lm = modelRegistry.get(learned);
    if (lm && lm.enabled) return { taskType, recommendedModelId: learned, reason: `You usually pick ${lm.label} for ${taskType} tasks.` };
  }
  const candidates = modelRegistry.enabled().filter(m => m.strengths.includes(taskType as ModelDef["strengths"][number]));
  const ranked = (candidates.length ? candidates : modelRegistry.enabled()).slice().sort((a, b) => b.qualityScore - a.qualityScore);
  const top = ranked[0];
  return { taskType, recommendedModelId: top?.id ?? "claude-sonnet-4-5", reason: `${top?.label ?? "Default"} ranks highest for ${taskType}.` };
}

export function recordOverride(userId: string, suggested: string, chosen: string, prompt: string): void {
  const taskType = classify(prompt);
  recommendations.recordOverride(userId, suggested, chosen, taskType);
}

export interface StreamOptions extends CompleteOptions {
  onDelta: (chunk: string) => void;
}

export async function stream(opts: StreamOptions): Promise<CompleteResult> {
  const { userId, projectId = null, messages, deadlineMs, onDelta } = opts;
  const pause = usageTracker.isPaused(userId);
  if (pause.paused) throw Object.assign(new Error(pause.reason ?? "Paused"), { code: "alert_paused", until: pause.until });
  const model = modelRegistry.get(opts.modelId);
  if (!model) throw Object.assign(new Error(`Unknown model: ${opts.modelId}`), { code: "unknown_model" });
  if (!model.enabled) throw Object.assign(new Error(`Model ${model.label} is disabled`), { code: "model_disabled" });
  await byokService.preload(userId);
  if (!isModelAvailable(userId, model)) {
    throw Object.assign(new Error(`${model.label} has no provider credential. Add a BYOK key in Settings → Multi-AI.`), { code: "provider_unavailable" });
  }
  const rl = rateLimiter.tryConsume(userId, model.id);
  if (!rl.ok) throw Object.assign(new Error(rl.reason), { code: "rate_limited", retryAfterMs: rl.retryAfterMs });
  const userPrompt = messages.filter(m => m.role === "user").map(m => m.content).join("\n");
  const taskType = classify(userPrompt);
  // Build a fallback chain only with truly-available models so we never drift into simulated billed runs.
  const chain: ModelDef[] = [model];
  for (const fid of model.fallbackChain) {
    const fm = modelRegistry.get(fid);
    if (fm && fm.enabled && isModelAvailable(userId, fm)) chain.push(fm);
  }
  let lastErr: Error | null = null;
  for (let i = 0; i < chain.length; i++) {
    const m = chain[i];
    if (circuitBreaker.isOpen(m.provider)) { lastErr = new Error(`${m.provider} circuit open`); continue; }
    const adapter = getAdapter(m.provider);
    const byokKey = byokService.get(userId, m.provider);
    const acquired = rateLimiter.acquire(m.provider);
    if (!acquired.ok) { lastErr = new Error(`${m.provider} concurrency limit`); continue; }
    const ctrl = new AbortController();
    const timeout = deadlineMs ? setTimeout(() => ctrl.abort(), deadlineMs) : null;
    try {
      if (i > 0) onDelta(`\n\n[switched to fallback: ${m.label}]\n\n`);
      const result = await adapter.stream(m, messages, { apiKey: byokKey, signal: ctrl.signal, maxTokens: 4096 }, onDelta);
      circuitBreaker.recordSuccess(m.provider);
      const cost = computeCost(m, result.inputTokens, result.outputTokens, !!byokKey);
      semanticCache.store(buildPromptKey(messages), result.content, model.id, userId, projectId);
      const servedByFallback = i > 0;
      // Attribute streamed usage to the actually-serving model so dashboards
      // stay consistent between single-mode, stream, and council.
      usageTracker.emit({
        userId, projectId, modelId: m.id, provider: m.provider, mode: "single",
        inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: cost, latencyMs: result.latencyMs,
        cacheHit: false, byok: !!byokKey, servedByFallback, taskType,
      });
      return {
        modelId: model.id, label: model.label, content: result.content,
        inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: cost, latencyMs: result.latencyMs,
        cacheHit: false, byok: !!byokKey, servedByFallback, servedBy: m.id, taskType,
      };
    } catch (e) {
      circuitBreaker.recordFailure(m.provider);
      lastErr = e instanceof Error ? e : new Error(String(e));
    } finally {
      if (timeout) clearTimeout(timeout);
      rateLimiter.release(m.provider);
    }
  }
  throw Object.assign(new Error(`All models in chain failed: ${lastErr?.message ?? "unknown"}`), { code: "chain_exhausted" });
}

export interface EmbedOptions {
  userId: string;
  projectId?: string | null;
  modelId?: string;
  inputs: string[];
}
export interface EmbedResponse {
  modelId: string;
  provider: Provider;
  vectors: number[][];
  inputTokens: number;
  costUsd: number;
  latencyMs: number;
  byok: boolean;
}

export async function embed(opts: EmbedOptions): Promise<EmbedResponse> {
  const { userId, projectId = null, inputs } = opts;
  if (!inputs.length) throw Object.assign(new Error("inputs must be non-empty"), { code: "bad_request" });
  const pause = usageTracker.isPaused(userId);
  if (pause.paused) throw Object.assign(new Error(pause.reason ?? "Paused"), { code: "alert_paused", until: pause.until });
  const modelId = opts.modelId || "gpt-5";
  const model = modelRegistry.get(modelId);
  if (!model) throw Object.assign(new Error(`Unknown model: ${modelId}`), { code: "unknown_model" });
  const adapter = getAdapter(model.provider);
  await byokService.preload(userId);
  const byokKey = byokService.get(userId, model.provider);
  const result = await adapter.embed(model, inputs, { apiKey: byokKey, maxTokens: 0 });
  const cost = (result.inputTokens / 1000) * (model.inputPer1k * 0.1) * (byokKey ? INFRA_MARGIN_PCT : 1);
  usageTracker.emit({
    userId, projectId, modelId: model.id, provider: model.provider, mode: "single",
    inputTokens: result.inputTokens, outputTokens: 0, costUsd: cost, latencyMs: result.latencyMs,
    cacheHit: false, byok: !!byokKey, servedByFallback: false, taskType: "embed",
  });
  return { modelId: model.id, provider: model.provider, vectors: result.vectors, inputTokens: result.inputTokens, costUsd: cost, latencyMs: result.latencyMs, byok: !!byokKey };
}

export function checkProviders(): Record<Provider, boolean> {
  const providers: Provider[] = ["openai", "anthropic", "google", "xai", "deepseek", "meta", "mistral", "qwen", "cohere", "ollama"];
  const out = {} as Record<Provider, boolean>;
  for (const p of providers) out[p] = isProviderConfigured(p);
  return out;
}
