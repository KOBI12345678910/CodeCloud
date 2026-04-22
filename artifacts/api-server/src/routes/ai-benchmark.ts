import { Router, type IRouter } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import { modelRegistry } from "../services/ai-gateway/registry";

const router: IRouter = Router();

router.get("/ai/benchmark", async (_req, res): Promise<void> => {
  await modelRegistry.preload();
  const models = modelRegistry.enabled();

  const benchmarks = models.map((m) => {
    const avgCost = (m.inputPer1k + m.outputPer1k) / 2;
    const valueScore = Math.round((m.qualityScore / Math.max(avgCost * 10000, 1)) * 10);
    const speedScore = Math.round(Math.max(0, 100 - m.avgLatencyMs / 50));

    return {
      id: m.id,
      label: m.label,
      provider: m.provider,
      tier: m.tier,
      scores: {
        quality: m.qualityScore,
        speed: speedScore,
        value: Math.min(100, valueScore),
        overall: Math.round((m.qualityScore * 0.4 + speedScore * 0.3 + Math.min(100, valueScore) * 0.3)),
      },
      pricing: {
        inputPer1k: m.inputPer1k,
        outputPer1k: m.outputPer1k,
        avgPer1k: avgCost,
        costFor1MTokens: avgCost * 1000,
      },
      capabilities: {
        contextWindow: m.contextWindow,
        supportsVision: m.supportsVision,
        supportsTools: m.supportsTools,
        strengths: m.strengths,
      },
      latency: {
        avgMs: m.avgLatencyMs,
        category: m.avgLatencyMs < 500 ? "ultra-fast" : m.avgLatencyMs < 1000 ? "fast" : m.avgLatencyMs < 2000 ? "moderate" : m.avgLatencyMs < 4000 ? "slow" : "very-slow",
      },
    };
  });

  benchmarks.sort((a, b) => b.scores.overall - a.scores.overall);

  const leaderboard = {
    bestQuality: benchmarks.reduce((best, b) => b.scores.quality > best.scores.quality ? b : best),
    bestValue: benchmarks.reduce((best, b) => b.scores.value > best.scores.value ? b : best),
    fastest: benchmarks.reduce((best, b) => b.scores.speed > best.scores.speed ? b : best),
    bestOverall: benchmarks[0],
    cheapest: benchmarks.reduce((best, b) => b.pricing.avgPer1k < best.pricing.avgPer1k ? b : best),
  };

  res.json({
    total: benchmarks.length,
    leaderboard: {
      bestQuality: { id: leaderboard.bestQuality.id, label: leaderboard.bestQuality.label, score: leaderboard.bestQuality.scores.quality },
      bestValue: { id: leaderboard.bestValue.id, label: leaderboard.bestValue.label, score: leaderboard.bestValue.scores.value },
      fastest: { id: leaderboard.fastest.id, label: leaderboard.fastest.label, avgMs: leaderboard.fastest.latency.avgMs },
      bestOverall: { id: leaderboard.bestOverall.id, label: leaderboard.bestOverall.label, score: leaderboard.bestOverall.scores.overall },
      cheapest: { id: leaderboard.cheapest.id, label: leaderboard.cheapest.label, costPer1k: leaderboard.cheapest.pricing.avgPer1k },
    },
    benchmarks,
  });
});

router.get("/ai/benchmark/category/:task", async (req, res): Promise<void> => {
  const task = req.params.task as string;
  const validTasks = ["code", "content", "math", "vision", "reasoning", "general"];
  if (!validTasks.includes(task)) {
    res.status(400).json({ error: "Invalid task. Must be: " + validTasks.join(", ") });
    return;
  }

  await modelRegistry.preload();
  const models = modelRegistry.enabled().filter((m) => m.strengths.includes(task as any));

  const ranked = models
    .map((m) => ({
      id: m.id,
      label: m.label,
      provider: m.provider,
      qualityScore: m.qualityScore,
      avgCostPer1k: (m.inputPer1k + m.outputPer1k) / 2,
      avgLatencyMs: m.avgLatencyMs,
    }))
    .sort((a, b) => b.qualityScore - a.qualityScore);

  res.json({ task, total: ranked.length, models: ranked });
});

export default router;
