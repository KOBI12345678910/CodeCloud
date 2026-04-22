import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { observabilityService } from "../services/observability";
import { redisCache } from "../services/redis-cache";
import { queueManager } from "../services/queue-manager";

const router: IRouter = Router();

const requireAdmin = async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): Promise<void> => {
  const user = (req as any).user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

router.get("/observability/dashboard", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const windowMs = parseInt(_req.query.window as string) || 3600_000;
  const dashboard = observabilityService.getDashboard(windowMs);
  res.json(dashboard);
});

router.get("/observability/latency", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const windowMs = parseInt(req.query.window as string) || 3600_000;
  res.json(observabilityService.getLatencyHistogram(windowMs));
});

router.get("/observability/errors", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const windowMs = parseInt(req.query.window as string) || 3600_000;
  res.json(observabilityService.getErrorRates(windowMs));
});

router.get("/observability/throughput", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const windowMs = parseInt(req.query.window as string) || 3600_000;
  res.json(observabilityService.getThroughput(windowMs));
});

router.get("/observability/latency-timeseries", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const windowMs = parseInt(req.query.window as string) || 3600_000;
  res.json(observabilityService.getLatencyTimeSeries(windowMs));
});

router.get("/observability/top-endpoints", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const windowMs = parseInt(req.query.window as string) || 3600_000;
  const limit = parseInt(req.query.limit as string) || 10;
  res.json(observabilityService.getTopEndpoints(windowMs, limit));
});

router.get("/observability/ai-gateway", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  res.json(observabilityService.getAiGatewayMetrics());
});

router.get("/observability/websocket", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  res.json(observabilityService.getWebSocketMetrics());
});

router.get("/observability/db-pool", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  res.json(observabilityService.getDbPoolHealth());
});

router.get("/observability/redis", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  res.json(redisCache.getStats());
});

router.get("/observability/queues", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  res.json(queueManager.getDashboard());
});

export default router;
