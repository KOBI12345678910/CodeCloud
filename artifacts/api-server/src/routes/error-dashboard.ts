import { Router, Request, Response } from "express";
import { errorDashboardService } from "../services/error-dashboard";
const router = Router();
router.post("/error-dashboard", (req: Request, res: Response): void => { res.status(201).json(errorDashboardService.record(req.body.projectId, req.body)); });
router.get("/error-dashboard/:projectId", (req: Request, res: Response): void => { res.json(errorDashboardService.list(req.params.projectId as string, req.query.status as any)); });
router.get("/error-dashboard/:projectId/stats", (req: Request, res: Response): void => { res.json(errorDashboardService.getStats(req.params.projectId as string)); });
router.get("/error-dashboard/event/:id", (req: Request, res: Response): void => { const e = errorDashboardService.get(req.params.id as string); e ? res.json(e) : res.status(404).json({ error: "Not found" }); });
router.put("/error-dashboard/event/:id/status", (req: Request, res: Response): void => { const e = errorDashboardService.updateStatus(req.params.id as string, req.body.status); e ? res.json(e) : res.status(404).json({ error: "Not found" }); });
export default router;
