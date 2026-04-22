import { Router, Request, Response } from "express";
import { deployRateLimitService } from "../services/deploy-ratelimit";

const router = Router();

router.get("/ratelimit/rules", (_req: Request, res: Response): void => {
  res.json({ rules: deployRateLimitService.getRules() });
});

router.post("/ratelimit/rules", (req: Request, res: Response): void => {
  const { endpoint, method, limitBy, maxRequests, windowSeconds, burstLimit, customResponse, enabled } = req.body;
  if (!endpoint || !maxRequests) { res.status(400).json({ error: "endpoint and maxRequests required" }); return; }
  const rule = deployRateLimitService.createRule({ endpoint, method: method || "ALL", limitBy: limitBy || "ip", maxRequests, windowSeconds: windowSeconds || 60, burstLimit: burstLimit || 0, customResponse: customResponse || null, enabled: enabled ?? true });
  res.status(201).json(rule);
});

router.put("/ratelimit/rules/:id", (req: Request, res: Response): void => {
  const result = deployRateLimitService.updateRule(req.params.id as string, req.body);
  if (!result) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json(result);
});

router.delete("/ratelimit/rules/:id", (req: Request, res: Response): void => {
  if (!deployRateLimitService.deleteRule(req.params.id as string)) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json({ success: true });
});

router.post("/ratelimit/check", (req: Request, res: Response): void => {
  const { endpoint, method, identifier, limitBy } = req.body;
  const result = deployRateLimitService.checkLimit(endpoint || "/", method || "GET", identifier || "unknown", limitBy || "ip");
  res.json(result);
});

router.get("/ratelimit/rules/:id/analytics", (req: Request, res: Response): void => {
  res.json(deployRateLimitService.getAnalytics(req.params.id as string));
});

export default router;
