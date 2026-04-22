import { Router, Request, Response } from "express";
import { serviceMeshService } from "../services/service-mesh";
const router = Router();
router.get("/service-mesh/:projectId", (req: Request, res: Response): void => { res.json(serviceMeshService.list(req.params.projectId as string)); });
router.post("/service-mesh", (req: Request, res: Response): void => { res.status(201).json(serviceMeshService.register(req.body)); });
router.get("/service-mesh/:projectId/discover/:name", (req: Request, res: Response): void => { const e = serviceMeshService.discover(req.params.projectId as string, req.params.name as string); e ? res.json(e) : res.status(404).json({ error: "Not found" }); });
router.post("/service-mesh/:id/health", (req: Request, res: Response): void => { const e = serviceMeshService.checkHealth(req.params.id as string); e ? res.json(e) : res.status(404).json({ error: "Not found" }); });
router.delete("/service-mesh/:id", (req: Request, res: Response): void => { serviceMeshService.deregister(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
