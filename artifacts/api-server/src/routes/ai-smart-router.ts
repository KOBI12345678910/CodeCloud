import { Router, type IRouter } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import { modelRegistry } from "../services/ai-gateway/registry";
import { smartRoute, estimateCost, recommendCheapest, recommendFastest, recommendBest } from "../services/ai-gateway/smart-router";
import type { TaskType } from "../services/ai-gateway/registry";

const router: IRouter = Router();

router.get("/ai/models", async (_req, res): Promise<void> => {
  await modelRegistry.preload();
  const models = modelRegistry.enabled();

  const grouped = {
    total: models.length,
    providers: [...new Set(models.map((m) => m.provider))].length,
    byTier: modelRegistry.groupedByTier(),
    models: models.map((m) => ({
      id: m.id,
      label: m.label,
      provider: m.provider,
      tier: m.tier,
      contextWindow: m.contextWindow,
      supportsVision: m.supportsVision,
      supportsTools: m.supportsTools,
      inputPer1k: m.inputPer1k,
      outputPer1k: m.outputPer1k,
      qualityScore: m.qualityScore,
      avgLatencyMs: m.avgLatencyMs,
      strengths: m.strengths,
      description: m.description,
      adapterReady: m.adapterReady,
    })),
  };

  res.json(grouped);
});

router.get("/ai/models/:id", async (req, res): Promise<void> => {
  await modelRegistry.preload();
  const model = modelRegistry.get(req.params.id);
  if (!model) {
    res.status(404).json({ error: "Model not found" });
    return;
  }
  res.json(model);
});

router.post("/ai/smart-route", requireJwtAuth, async (req, res): Promise<void> => {
  await modelRegistry.preload();

  const { task, maxBudgetPer1k, minQuality, requireVision, requireTools, preferredTier, preferFastest, preferCheapest, excludeProviders, excludeModels, contextLength } = req.body;

  const validTasks: TaskType[] = ["code", "content", "math", "vision", "reasoning", "general"];
  if (!task || !validTasks.includes(task)) {
    res.status(400).json({ error: "Invalid task. Must be one of: " + validTasks.join(", ") });
    return;
  }

  const result = smartRoute({
    task,
    maxBudgetPer1k,
    minQuality,
    requireVision,
    requireTools,
    preferredTier,
    preferFastest,
    preferCheapest,
    excludeProviders,
    excludeModels,
    contextLength,
  });

  if (!result) {
    res.status(404).json({ error: "No model matches the given criteria" });
    return;
  }

  res.json(result);
});

router.post("/ai/estimate-cost", async (req, res): Promise<void> => {
  const { modelId, inputTokens, outputTokens } = req.body;
  if (!modelId || !inputTokens || !outputTokens) {
    res.status(400).json({ error: "modelId, inputTokens, outputTokens required" });
    return;
  }

  await modelRegistry.preload();
  const est = estimateCost(modelId, inputTokens, outputTokens);
  if (!est) {
    res.status(404).json({ error: "Model not found" });
    return;
  }

  res.json(est);
});

router.get("/ai/recommend/:strategy/:task", async (req, res): Promise<void> => {
  const { strategy, task } = req.params;
  const validTasks: TaskType[] = ["code", "content", "math", "vision", "reasoning", "general"];
  if (!validTasks.includes(task as TaskType)) {
    res.status(400).json({ error: "Invalid task" });
    return;
  }

  await modelRegistry.preload();

  let result;
  switch (strategy) {
    case "cheapest":
      result = recommendCheapest(task as TaskType);
      break;
    case "fastest":
      result = recommendFastest(task as TaskType);
      break;
    case "best":
      result = recommendBest(task as TaskType);
      break;
    default:
      res.status(400).json({ error: "Strategy must be: cheapest, fastest, or best" });
      return;
  }

  if (!result) {
    res.status(404).json({ error: "No model found for criteria" });
    return;
  }

  res.json(result);
});

router.post("/ai/compare", async (req, res): Promise<void> => {
  const { modelIds } = req.body;
  if (!Array.isArray(modelIds) || modelIds.length < 2) {
    res.status(400).json({ error: "Provide at least 2 model IDs to compare" });
    return;
  }

  await modelRegistry.preload();
  const models = modelIds
    .map((id: string) => modelRegistry.get(id))
    .filter(Boolean);

  if (models.length < 2) {
    res.status(404).json({ error: "Not enough valid models found" });
    return;
  }

  res.json({
    comparison: models.map((m) => ({
      id: m!.id,
      label: m!.label,
      provider: m!.provider,
      tier: m!.tier,
      qualityScore: m!.qualityScore,
      avgCostPer1k: ((m!.inputPer1k + m!.outputPer1k) / 2).toFixed(6),
      avgLatencyMs: m!.avgLatencyMs,
      contextWindow: m!.contextWindow,
      supportsVision: m!.supportsVision,
      supportsTools: m!.supportsTools,
      strengths: m!.strengths,
    })),
  });
});

export default router;
