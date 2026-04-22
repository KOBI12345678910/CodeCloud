import { Router, Request, Response } from "express";
import { edgeConfigService } from "../services/edge-config";
const router = Router();
router.get("/edge-config/project/:projectId", (req: Request, res: Response): void => { res.json(edgeConfigService.listByProject(req.params.projectId as string)); });
router.post("/edge-config", (req: Request, res: Response): void => { res.status(201).json(edgeConfigService.set(req.body.projectId, req.body.key, req.body.value, req.body.region, req.body.ttl)); });
router.get("/edge-config/:projectId/:key", (req: Request, res: Response): void => { const c = edgeConfigService.get(req.params.projectId as string, req.params.key as string); c ? res.json(c) : res.status(404).json({ error: "Not found" }); });
router.delete("/edge-config/:projectId/:key", (req: Request, res: Response): void => { edgeConfigService.delete(req.params.projectId as string, req.params.key as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
