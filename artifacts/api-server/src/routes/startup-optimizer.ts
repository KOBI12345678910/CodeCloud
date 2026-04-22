import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { startupOptimizerService } from "../services/startup-optimizer";

const router: IRouter = Router();

router.post("/projects/:projectId/containers/:containerId/startup/analyze", requireAuth, async (req, res): Promise<void> => {
  const analysis = await startupOptimizerService.analyze(req.params.containerId as string, req.params.projectId as string);
  res.json(analysis);
});

router.get("/projects/:projectId/containers/:containerId/startup", requireAuth, async (req, res): Promise<void> => {
  const analysis = await startupOptimizerService.getAnalysis(req.params.containerId as string);
  if (!analysis) { res.status(404).json({ error: "No analysis found. Run analyze first." }); return; }
  res.json(analysis);
});

router.get("/projects/:projectId/containers/:containerId/startup/benchmarks", requireAuth, async (req, res): Promise<void> => {
  const benchmarks = await startupOptimizerService.getBenchmarks(req.params.containerId as string);
  res.json(benchmarks);
});

router.post("/projects/:projectId/containers/:containerId/startup/benchmarks", requireAuth, async (req, res): Promise<void> => {
  const bm = await startupOptimizerService.addBenchmark(req.params.containerId as string, req.body.label || "Manual");
  if (!bm) { res.status(404).json({ error: "No analysis found" }); return; }
  res.json(bm);
});

router.get("/projects/:projectId/containers/:containerId/startup/recommendations", requireAuth, async (req, res): Promise<void> => {
  const recs = await startupOptimizerService.getRecommendations(req.params.containerId as string);
  res.json(recs);
});

export default router;
