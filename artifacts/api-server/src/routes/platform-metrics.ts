import { Router, Request, Response } from "express";
import { platformMetricsService } from "../services/platform-metrics";
const router = Router();
router.get("/platform-metrics/dashboard", (_req: Request, res: Response): void => { res.json(platformMetricsService.getDashboard()); });
router.get("/platform-metrics/names", (_req: Request, res: Response): void => { res.json(platformMetricsService.getNames()); });
router.get("/platform-metrics/query/:name", (req: Request, res: Response): void => { res.json(platformMetricsService.query(req.params.name as string, Number(req.query.minutes) || 60)); });
router.get("/platform-metrics/latest/:name", (req: Request, res: Response): void => { const m = platformMetricsService.getLatest(req.params.name as string); m ? res.json(m) : res.status(404).json({ error: "No data" }); });
router.post("/platform-metrics", (req: Request, res: Response): void => { platformMetricsService.record(req.body.name, req.body.value, req.body.unit, req.body.tags); res.json({ success: true }); });
export default router;
