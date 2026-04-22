import { modelRegistry, type ModelDef, type TaskType, type Tier } from "./registry";

export interface RoutingRequest {
  task: TaskType;
  maxBudgetPer1k?: number;
  minQuality?: number;
  requireVision?: boolean;
  requireTools?: boolean;
  preferredTier?: Tier;
  preferFastest?: boolean;
  preferCheapest?: boolean;
  excludeProviders?: string[];
  excludeModels?: string[];
  contextLength?: number;
}

export interface RoutingResult {
  model: ModelDef;
  reason: string;
  alternatives: { model: ModelDef; reason: string }[];
  estimatedCostPer1k: number;
  savings?: { comparedTo: string; savedPercent: number };
}

export function smartRoute(req: RoutingRequest): RoutingResult | null {
  const candidates = modelRegistry.enabled().filter((m) => {
    if (req.requireVision && !m.supportsVision) return false;
    if (req.requireTools && !m.supportsTools) return false;
    if (req.contextLength && m.contextWindow < req.contextLength) return false;
    if (req.excludeProviders?.includes(m.provider)) return false;
    if (req.excludeModels?.includes(m.id)) return false;
    if (req.preferredTier && m.tier !== req.preferredTier) return false;
    if (req.minQuality && m.qualityScore < req.minQuality) return false;
    if (req.maxBudgetPer1k) {
      const avgCost = (m.inputPer1k + m.outputPer1k) / 2;
      if (avgCost > req.maxBudgetPer1k) return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;

  const taskRelevant = candidates.filter((m) => m.strengths.includes(req.task));
  const pool = taskRelevant.length > 0 ? taskRelevant : candidates;

  const scored = pool.map((m) => {
    let score = m.qualityScore;

    if (m.strengths.includes(req.task)) score += 5;

    if (req.preferCheapest) {
      const avgCost = (m.inputPer1k + m.outputPer1k) / 2;
      score += Math.max(0, 20 - avgCost * 2000);
    }

    if (req.preferFastest) {
      score += Math.max(0, 10 - m.avgLatencyMs / 500);
    }

    return { model: m, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const avgCost = (best.model.inputPer1k + best.model.outputPer1k) / 2;

  const mostExpensive = modelRegistry.enabled().reduce((max, m) => {
    const c = (m.inputPer1k + m.outputPer1k) / 2;
    return c > max.cost ? { model: m, cost: c } : max;
  }, { model: best.model, cost: avgCost });

  const savings = mostExpensive.cost > avgCost
    ? { comparedTo: mostExpensive.model.label, savedPercent: Math.round((1 - avgCost / mostExpensive.cost) * 100) }
    : undefined;

  return {
    model: best.model,
    reason: buildReason(best.model, req),
    alternatives: scored.slice(1, 4).map((s) => ({
      model: s.model,
      reason: buildReason(s.model, req),
    })),
    estimatedCostPer1k: avgCost,
    savings,
  };
}

function buildReason(m: ModelDef, req: RoutingRequest): string {
  const parts: string[] = [];
  if (m.strengths.includes(req.task)) parts.push(`strong at ${req.task}`);
  if (req.preferCheapest) parts.push(`$${((m.inputPer1k + m.outputPer1k) / 2).toFixed(5)}/1k tokens`);
  if (req.preferFastest) parts.push(`~${m.avgLatencyMs}ms latency`);
  parts.push(`quality ${m.qualityScore}/100`);
  return parts.join(", ");
}

export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
} | null {
  const model = modelRegistry.get(modelId);
  if (!model) return null;

  const inputCost = (inputTokens / 1000) * model.inputPer1k;
  const outputCost = (outputTokens / 1000) * model.outputPer1k;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    model: model.label,
  };
}

export function compareModels(modelIds: string[]): ModelDef[] {
  return modelIds
    .map((id) => modelRegistry.get(id))
    .filter((m): m is ModelDef => !!m);
}

export function recommendCheapest(task: TaskType, minQuality = 75): RoutingResult | null {
  return smartRoute({ task, minQuality, preferCheapest: true });
}

export function recommendFastest(task: TaskType, minQuality = 75): RoutingResult | null {
  return smartRoute({ task, minQuality, preferFastest: true });
}

export function recommendBest(task: TaskType): RoutingResult | null {
  return smartRoute({ task, minQuality: 90 });
}
