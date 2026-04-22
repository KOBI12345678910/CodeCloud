import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { trafficAnalyticsService } from "../services/traffic-analytics";

const router: IRouter = Router();

router.get("/projects/:id/traffic", requireAuth, async (req, res): Promise<void> => {
  const period = (req.query.period as string) || "24h";
  const hours = period === "7d" ? 168 : period === "30d" ? 720 : 24;
  try { res.json(trafficAnalyticsService.getSummary(hours)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
