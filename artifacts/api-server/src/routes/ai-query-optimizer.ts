import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { aiQueryOptimizerService } from "../services/ai-query-optimizer";

const router: IRouter = Router();

router.post("/query-optimizer/analyze", requireAuth, async (req, res): Promise<void> => {
  const { query, databaseId } = req.body;
  if (!query) { res.status(400).json({ error: "Query is required" }); return; }
  const analysis = await aiQueryOptimizerService.analyzeQuery(query, databaseId);
  res.json(analysis);
});

router.post("/query-optimizer/explain", requireAuth, async (req, res): Promise<void> => {
  const { query } = req.body;
  if (!query) { res.status(400).json({ error: "Query is required" }); return; }
  const plan = await aiQueryOptimizerService.explainPlan(query);
  res.json(plan);
});

router.post("/query-optimizer/indexes", requireAuth, async (req, res): Promise<void> => {
  const { query } = req.body;
  if (!query) { res.status(400).json({ error: "Query is required" }); return; }
  const indexes = await aiQueryOptimizerService.suggestIndexes(query);
  res.json(indexes);
});

router.post("/query-optimizer/rewrite", requireAuth, async (req, res): Promise<void> => {
  const { query } = req.body;
  if (!query) { res.status(400).json({ error: "Query is required" }); return; }
  const result = await aiQueryOptimizerService.rewriteQuery(query);
  res.json(result);
});

router.post("/query-optimizer/benchmark", requireAuth, async (req, res): Promise<void> => {
  const { query } = req.body;
  if (!query) { res.status(400).json({ error: "Query is required" }); return; }
  const benchmark = await aiQueryOptimizerService.benchmark(query);
  res.json(benchmark);
});

router.get("/query-optimizer/history", requireAuth, async (_req, res): Promise<void> => {
  res.json(aiQueryOptimizerService.getHistory());
});

router.delete("/query-optimizer/history", requireAuth, async (_req, res): Promise<void> => {
  aiQueryOptimizerService.clearHistory();
  res.json({ success: true });
});

export default router;
