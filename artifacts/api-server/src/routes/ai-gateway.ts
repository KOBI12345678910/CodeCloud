import { Router, type IRouter, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { modelRegistry, type Provider } from "../services/ai-gateway/registry";
import { complete, runCouncil, recommend, recordOverride, checkProviders, stream as streamComplete, embed, promoteCouncilWinner } from "../services/ai-gateway/gateway";
import { byokService } from "../services/ai-gateway/byok";
import { usageTracker } from "../services/ai-gateway/usage";
import { semanticCache } from "../services/ai-gateway/cache";
import { circuitBreaker } from "../services/ai-gateway/circuit-breaker";
import { rateLimiter } from "../services/ai-gateway/rate-limiter";
import { recommendations } from "../services/ai-gateway/classifier";
import { db, creditsLedgerTable } from "@workspace/db";

const router: IRouter = Router();

// Preload model registry overrides at module load so every gateway path
// (complete/stream/council/recommend/comparison) uses authoritative DB state,
// not just the routes that explicitly call preload().
void modelRegistry.preload();

const VALID_PROVIDERS: Provider[] = ["openai", "anthropic", "google", "xai", "deepseek", "meta", "mistral", "qwen", "cohere", "ollama"];

function sendErr(res: Response, e: unknown): void {
  const err = e as { code?: string; message?: string; retryAfterMs?: number; until?: number };
  const code = err.code ?? "internal";
  const status = code === "alert_paused" ? 402
    : code === "rate_limited" ? 429
    : code === "unknown_model" || code === "model_disabled" || code === "no_available_models" || code === "council_winner_invalid" ? 400
    : code === "council_run_not_found" ? 404
    : code === "council_run_forbidden" ? 403
    : code === "council_already_promoted" ? 409
    : code === "provider_unavailable" ? 424
    : code === "chain_exhausted" ? 502
    : 500;
  res.status(status).json({ error: err.message ?? "Gateway error", code, retryAfterMs: err.retryAfterMs, pausedUntil: err.until });
}

router.get("/ai/gateway/models", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  await modelRegistry.preload();
  await byokService.preload(userId);
  const providers = checkProviders();
  const models = modelRegistry.list().map(m => ({
    id: m.id, label: m.label, provider: m.provider, tier: m.tier,
    contextWindow: m.contextWindow, supportsVision: m.supportsVision, supportsTools: m.supportsTools,
    inputPer1k: m.inputPer1k, outputPer1k: m.outputPer1k,
    fallbackChain: m.fallbackChain, enabled: m.enabled,
    qualityScore: m.qualityScore, avgLatencyMs: m.avgLatencyMs,
    strengths: m.strengths, description: m.description,
    available: providers[m.provider] || byokService.has(userId, m.provider),
    byok: byokService.has(userId, m.provider),
  }));
  res.json({
    models,
    grouped: {
      premium: models.filter(m => m.tier === "premium"),
      standard: models.filter(m => m.tier === "standard"),
      economy: models.filter(m => m.tier === "economy"),
      free: models.filter(m => m.tier === "free"),
    },
    storage: "db-backed",
    judgeModelId: modelRegistry.getJudgeModelId(),
    judgeFallbackId: modelRegistry.getJudgeFallbackId(),
    councilMargin: modelRegistry.getCouncilMargin(),
    providers,
    version: modelRegistry.getVersion(),
  });
});

router.patch("/ai/gateway/models/:id", requireAuth, async (req, res): Promise<void> => {
  const { user, userId } = req as AuthenticatedRequest;
  // The model registry is global across all tenants — only platform admins may mutate it.
  // Team-plan users were previously allowed; that was a privilege-escalation bug.
  if ((user as { role?: string }).role !== "admin") {
    res.status(403).json({ error: "Admin role required to edit the global model registry" }); return;
  }
  const { id } = req.params;
  const body = (req.body ?? {}) as { enabled?: boolean; inputPer1k?: number; outputPer1k?: number; fallbackChain?: string[]; qualityScore?: number; note?: string };
  const updated = await modelRegistry.update(id as string, {
    enabled: body.enabled,
    inputPer1k: body.inputPer1k,
    outputPer1k: body.outputPer1k,
    fallbackChain: body.fallbackChain,
    qualityScore: body.qualityScore,
  }, userId, body.note);
  if (!updated) { res.status(404).json({ error: "Model not found" }); return; }
  res.json({ ...updated, version: modelRegistry.getVersion() });
});

router.get("/ai/gateway/models/audit", requireAuth, async (req, res): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  if ((user as { role?: string }).role !== "admin") {
    res.status(403).json({ error: "Admin role required" }); return;
  }
  const modelId = typeof req.query.modelId === "string" ? req.query.modelId : undefined;
  const rows = await modelRegistry.auditLog(modelId, 100);
  res.json({ entries: rows });
});

router.post("/ai/gateway/recommend", requireAuth, (req, res): void => {
  const { userId } = req as AuthenticatedRequest;
  const prompt = String((req.body as { prompt?: string })?.prompt ?? "");
  res.json(recommend(userId, prompt));
});

router.post("/ai/gateway/recommend/override", requireAuth, (req, res): void => {
  const { userId } = req as AuthenticatedRequest;
  const { suggested, chosen, prompt } = (req.body ?? {}) as { suggested?: string; chosen?: string; prompt?: string };
  if (!suggested || !chosen || !prompt) { res.status(400).json({ error: "suggested, chosen, prompt required" }); return; }
  recordOverride(userId, suggested, chosen, prompt);
  res.json({ ok: true });
});

router.post("/ai/gateway/complete", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const body = (req.body ?? {}) as { modelId?: string; messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>; projectId?: string | null; conversationId?: string | null; noCache?: boolean; deadlineMs?: number };
  if (!body.modelId || !Array.isArray(body.messages) || body.messages.length === 0) { res.status(400).json({ error: "modelId and messages required" }); return; }
  try {
    const result = await complete({
      userId, modelId: body.modelId, messages: body.messages,
      projectId: body.projectId ?? null, conversationId: body.conversationId ?? null,
      noCache: body.noCache, deadlineMs: body.deadlineMs,
    });
    res.json(result);
  } catch (e) { sendErr(res, e); }
});

router.post("/ai/gateway/stream", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const body = (req.body ?? {}) as { modelId?: string; messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>; projectId?: string | null; deadlineMs?: number };
  if (!body.modelId || !Array.isArray(body.messages) || body.messages.length === 0) { res.status(400).json({ error: "modelId and messages required" }); return; }
  res.setHeader("content-type", "text/event-stream");
  res.setHeader("cache-control", "no-cache, no-transform");
  res.setHeader("connection", "keep-alive");
  res.setHeader("x-accel-buffering", "no");
  res.flushHeaders?.();
  const send = (event: string, data: unknown): void => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  try {
    const result = await streamComplete({
      userId, modelId: body.modelId, messages: body.messages,
      projectId: body.projectId ?? null, deadlineMs: body.deadlineMs,
      onDelta: (chunk) => send("delta", { content: chunk }),
    });
    send("done", result);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    send("error", { error: err.message ?? "Stream failed", code: err.code ?? "internal" });
  } finally {
    res.end();
  }
});

router.post("/ai/gateway/embed", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const body = (req.body ?? {}) as { modelId?: string; inputs?: string[]; projectId?: string | null };
  if (!Array.isArray(body.inputs) || body.inputs.length === 0) { res.status(400).json({ error: "inputs (string[]) required" }); return; }
  try {
    const result = await embed({
      userId, projectId: body.projectId ?? null,
      modelId: body.modelId, inputs: body.inputs,
    });
    res.json(result);
  } catch (e) { sendErr(res, e); }
});

router.post("/ai/gateway/council", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const body = (req.body ?? {}) as { messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>; projectId?: string | null; modelIds?: string[]; deadlineMs?: number };
  if (!Array.isArray(body.messages) || body.messages.length === 0) { res.status(400).json({ error: "messages required" }); return; }
  try {
    const result = await runCouncil({
      userId, messages: body.messages, projectId: body.projectId ?? null,
      modelIds: body.modelIds, deadlineMs: body.deadlineMs,
    });
    res.json(result);
  } catch (e) { sendErr(res, e); }
});

router.post("/ai/gateway/council/promote", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  // Refund is computed strictly from server-side council run state. The client
  // sends only the run id + chosen winner — pricing is never trusted from the
  // request body (previous version was exploitable to mint credits).
  const { councilRunId, winnerModelId } = (req.body ?? {}) as { councilRunId?: string; winnerModelId?: string };
  if (!councilRunId || !winnerModelId) { res.status(400).json({ error: "councilRunId and winnerModelId required" }); return; }
  let promote;
  try {
    promote = promoteCouncilWinner(userId, String(councilRunId), String(winnerModelId));
  } catch (e) { sendErr(res, e); return; }
  let ledgerId: string | null = null;
  if (promote.refundUsd > 0) {
    try {
      const microUsd = Math.round(promote.refundUsd * 1_000_000);
      const inserted = await db.insert(creditsLedgerTable).values({
        userId,
        kind: "task_refund",
        amountMicroUsd: microUsd,
        description: `Council promote refund (winner=${winnerModelId})`,
        metadata: { source: "ai_gateway_council_promote", councilRunId, winnerModelId, originalUsd: promote.originalUsd, finalUsd: promote.finalUsd },
      }).returning({ id: creditsLedgerTable.id });
      ledgerId = inserted[0]?.id ?? null;
    } catch (e) {
      // Refund ledger write is the source of truth for the user's credit
      // balance; if it fails the promotion has not actually granted any
      // credit. Roll back the in-memory promoted flag so the user can retry,
      // and surface a 5xx instead of falsely reporting ok:true.
      console.error("[ai-gateway] council promote refund ledger insert failed:", e);
      try {
        const { getCouncilRun } = await import("../services/ai-gateway/gateway");
        const r = getCouncilRun(String(councilRunId));
        if (r) r.promoted = false;
      } catch { /* best-effort rollback */ }
      res.status(502).json({ error: "Refund ledger write failed; please retry", code: "refund_ledger_failed" });
      return;
    }
  }
  res.json({
    ok: true, userId,
    refundUsd: promote.refundUsd,
    refundMicroUsd: Math.round(promote.refundUsd * 1_000_000),
    ledgerEntryId: ledgerId,
    originalUsd: promote.originalUsd, finalUsd: promote.finalUsd,
    refundKind: "task_refund",
    runId: promote.runId, winnerModelId: promote.winnerModelId,
  });
});

router.get("/ai/gateway/byok", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  res.json({ keys: await byokService.list(userId) });
});

router.put("/ai/gateway/byok/:provider", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { provider } = req.params;
  const { apiKey } = (req.body ?? {}) as { apiKey?: string };
  if (!VALID_PROVIDERS.includes(provider as Provider)) { res.status(400).json({ error: "Unknown provider" }); return; }
  if (!apiKey || apiKey.length < 8) { res.status(400).json({ error: "apiKey required (min 8 chars)" }); return; }
  res.json(await byokService.set(userId, provider as Provider, apiKey));
});

router.delete("/ai/gateway/byok/:provider", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { provider } = req.params;
  if (!VALID_PROVIDERS.includes(provider as Provider)) { res.status(400).json({ error: "Unknown provider" }); return; }
  const ok = await byokService.remove(userId, provider as Provider);
  res.json({ ok });
});

router.get("/ai/gateway/alerts", requireAuth, (req, res): void => {
  const { userId } = req as AuthenticatedRequest;
  res.json({ ...usageTracker.getAlerts(userId), pause: usageTracker.isPaused(userId) });
});

router.put("/ai/gateway/alerts", requireAuth, (req, res): void => {
  const { userId } = req as AuthenticatedRequest;
  const body = (req.body ?? {}) as { perTaskUsd?: number; perDayUsd?: number; perMonthUsd?: number; enabled?: boolean };
  const sane = (v: unknown): number | undefined => {
    if (v === undefined || v === null) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return Math.min(n, 1_000_000);
  };
  const cleaned = {
    perTaskUsd: sane(body.perTaskUsd),
    perDayUsd: sane(body.perDayUsd),
    perMonthUsd: sane(body.perMonthUsd),
    enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
  };
  if (cleaned.perTaskUsd === undefined && cleaned.perDayUsd === undefined && cleaned.perMonthUsd === undefined && cleaned.enabled === undefined && (body.perTaskUsd !== undefined || body.perDayUsd !== undefined || body.perMonthUsd !== undefined)) {
    res.status(400).json({ error: "alert thresholds must be finite, non-negative numbers" }); return;
  }
  res.json(usageTracker.setAlerts(userId, cleaned));
});

router.post("/ai/gateway/alerts/acknowledge", requireAuth, (req, res): void => {
  const { userId } = req as AuthenticatedRequest;
  usageTracker.acknowledge(userId);
  res.json({ ok: true });
});

router.get("/ai/gateway/usage", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const sinceMs = req.query.windowMs ? Number(req.query.windowMs) : 24 * 60 * 60 * 1000;
  // Read from DB so totals & events survive process restarts and reflect
  // the true rolling window (24h/7d/30d/90d).
  const [events, totals] = await Promise.all([
    usageTracker.listFromDb({ userId, sinceMs, limit: 200 }),
    usageTracker.totalsFromDb(userId, sinceMs),
  ]);
  res.json({ events, totals });
});

router.get("/ai/gateway/comparison", requireAuth, async (req, res): Promise<void> => {
  const window = String(req.query.window ?? "7d");
  const sinceMs = window === "30d" ? 30 * 86400000 : window === "90d" ? 90 * 86400000 : 7 * 86400000;
  await modelRegistry.preload();
  // Default to caller-scoped stats so we don't leak cross-tenant usage. Admins
  // may opt into the global benchmarking view by passing scope=global.
  const { userId } = req as AuthenticatedRequest;
  const user = (req as AuthenticatedRequest).user as { role?: string } | undefined;
  const scope = String(req.query.scope ?? "user");
  const isGlobal = scope === "global" && user?.role === "admin";
  const all = await usageTracker.listFromDb({ sinceMs, limit: 5000, ...(isGlobal ? {} : { userId }) });
  const models = modelRegistry.list();
  const stats = models.map(m => {
    const evs = all.filter(e => e.modelId === m.id);
    const success = evs.filter(e => e.outputTokens > 0 || e.cacheHit).length;
    const totalCost = evs.reduce((s, e) => s + e.costUsd, 0);
    const avgLatency = evs.length ? evs.reduce((s, e) => s + e.latencyMs, 0) / evs.length : m.avgLatencyMs;
    const avgCost = evs.length ? totalCost / evs.length : 0;
    const judgeEvs = all.filter(e => e.modelId === m.id && e.rubric);
    const avgRubric = judgeEvs.length ? judgeEvs.reduce((s, e) => s + (e.rubric?.total ?? 0), 0) / judgeEvs.length : m.qualityScore;
    const taskTypeBreakdown: Record<string, number> = {};
    for (const e of evs) taskTypeBreakdown[e.taskType] = (taskTypeBreakdown[e.taskType] ?? 0) + 1;
    return {
      modelId: m.id, label: m.label, provider: m.provider, tier: m.tier,
      tasks: evs.length, success, successRate: evs.length ? success / evs.length : 1,
      avgLatencyMs: Math.round(avgLatency), avgCostUsd: avgCost, totalCostUsd: totalCost,
      qualityScore: Math.round(avgRubric), strengths: m.strengths, taskTypeBreakdown,
    };
  });
  // Recommendation counts must follow the same scoping as stats — otherwise a
  // regular user could see cross-tenant pick rates.
  const recCounts = isGlobal ? recommendations.globalCounts() : recommendations.userCounts(userId);
  res.json({ window, scope: isGlobal ? "global" : "user", stats, recommendationCounts: recCounts });
});

router.get("/ai/gateway/health", requireAuth, (req, res): void => {
  // The full operational view (per-user rate-limiter buckets, global cache
  // stats) is admin-only; non-admins get a caller-scoped summary so they can
  // still see whether providers are configured for their own UI.
  const user = (req as AuthenticatedRequest).user as { role?: string } | undefined;
  if (user?.role === "admin") {
    res.json({
      cache: semanticCache.stats(),
      circuitBreaker: circuitBreaker.status(),
      rateLimiter: rateLimiter.status(),
      providers: checkProviders(),
    });
    return;
  }
  res.json({
    circuitBreaker: circuitBreaker.status(),
    providers: checkProviders(),
  });
});

export default router;
