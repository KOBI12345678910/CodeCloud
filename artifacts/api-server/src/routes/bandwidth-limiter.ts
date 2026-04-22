import { Router, Request, Response } from "express";
import { bandwidthLimiterService } from "../services/bandwidth-limiter";

const router = Router();

router.get("/bandwidth/rules", (_req: Request, res: Response): void => {
  res.json({ rules: bandwidthLimiterService.getRules() });
});

router.post("/bandwidth/rules", (req: Request, res: Response): void => {
  const { containerId, ingressLimitKBs, egressLimitKBs, burstAllowanceKB, qosPriority, enabled } = req.body;
  if (!containerId) { res.status(400).json({ error: "containerId required" }); return; }
  res.status(201).json(bandwidthLimiterService.setRule({ containerId, ingressLimitKBs: ingressLimitKBs || 1000, egressLimitKBs: egressLimitKBs || 1000, burstAllowanceKB: burstAllowanceKB || 500, qosPriority: qosPriority || "normal", enabled: enabled ?? true }));
});

router.delete("/bandwidth/rules/:containerId", (req: Request, res: Response): void => {
  if (!bandwidthLimiterService.deleteRule(req.params.containerId as string)) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json({ success: true });
});

router.post("/bandwidth/check", (req: Request, res: Response): void => {
  const { containerId, ingressKBs, egressKBs } = req.body;
  if (!containerId) { res.status(400).json({ error: "containerId required" }); return; }
  res.json(bandwidthLimiterService.checkBandwidth(containerId, ingressKBs || 0, egressKBs || 0));
});

router.get("/bandwidth/:containerId/usage", (req: Request, res: Response): void => {
  res.json({ usage: bandwidthLimiterService.getUsage(req.params.containerId as string) });
});

router.get("/bandwidth/:containerId/stats", (req: Request, res: Response): void => {
  res.json(bandwidthLimiterService.getStats(req.params.containerId as string));
});

export default router;
