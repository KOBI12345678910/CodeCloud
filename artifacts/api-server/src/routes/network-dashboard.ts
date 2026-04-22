import { Router, Request, Response } from "express";
import { networkDashboardService } from "../services/network-dashboard";
const router = Router();
router.get("/network-dashboard", (_req: Request, res: Response): void => { res.json(networkDashboardService.getOverview()); });
router.get("/network-dashboard/:containerId/connections", (req: Request, res: Response): void => { res.json(networkDashboardService.getConnections(req.params.containerId as string)); });
router.get("/network-dashboard/:containerId/stats", (req: Request, res: Response): void => { const s = networkDashboardService.getStats(req.params.containerId as string); s ? res.json(s) : res.status(404).json({ error: "No stats" }); });
router.post("/network-dashboard/:containerId/connections", (req: Request, res: Response): void => { networkDashboardService.setConnections(req.params.containerId as string, req.body.connections || []); res.json({ success: true }); });
router.post("/network-dashboard/:containerId/stats", (req: Request, res: Response): void => { networkDashboardService.updateStats(req.params.containerId as string, req.body); res.json({ success: true }); });
export default router;
