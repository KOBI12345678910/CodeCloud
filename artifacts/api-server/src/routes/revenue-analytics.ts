import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { revenueAnalyticsService } from "../services/revenue-analytics";

const router: IRouter = Router();

router.get("/admin/revenue", requireAuth, async (_req, res): Promise<void> => {
  const metrics = await revenueAnalyticsService.getMetrics();
  res.json(metrics);
});

export default router;
