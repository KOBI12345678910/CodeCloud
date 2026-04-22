import { Router, Request, Response } from "express";
import { trafficAnalyticsService } from "../services/traffic-analytics";
const router = Router();
router.get("/traffic-analytics", (req: Request, res: Response): void => { res.json(trafficAnalyticsService.getSummary(Number(req.query.hours) || 24)); });
router.post("/traffic-analytics/record", (req: Request, res: Response): void => { const { path, status, responseTime, country, bytes } = req.body; trafficAnalyticsService.record(path, status, responseTime, country, bytes); res.json({ success: true }); });
export default router;
