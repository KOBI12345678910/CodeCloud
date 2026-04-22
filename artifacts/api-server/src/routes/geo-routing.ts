import { Router, Request, Response } from "express";
import { geoRoutingService } from "../services/geo-routing";
const router = Router();
router.get("/geo-routing", (_req: Request, res: Response): void => { res.json(geoRoutingService.listConfigs()); });
router.get("/geo-routing/:projectId", (req: Request, res: Response): void => { const c = geoRoutingService.getConfig(req.params.projectId as string); c ? res.json(c) : res.status(404).json({ error: "Not found" }); });
router.post("/geo-routing/:projectId", (req: Request, res: Response): void => { res.json(geoRoutingService.setConfig(req.params.projectId as string, req.body)); });
router.post("/geo-routing/:projectId/resolve", (req: Request, res: Response): void => { const r = geoRoutingService.resolve(req.params.projectId as string, req.body.clientRegion || "us-east-1"); r ? res.json(r) : res.status(404).json({ error: "No config" }); });
router.delete("/geo-routing/:projectId", (req: Request, res: Response): void => { geoRoutingService.deleteConfig(req.params.projectId as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
