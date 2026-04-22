import { Router, Request, Response } from "express";
import { adminKpiService } from "../services/admin-kpi";
const router = Router();
router.get("/admin-kpi", (_req: Request, res: Response): void => { res.json(adminKpiService.getDashboard()); });
router.get("/admin-kpi/timeseries/:metric", (req: Request, res: Response): void => { res.json(adminKpiService.getTimeSeries(req.params.metric as string, Number(req.query.days) || 30)); });
export default router;
