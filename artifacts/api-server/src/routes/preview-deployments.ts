import { Router, Request, Response } from "express";
import { previewDeploymentsService } from "../services/preview-deployments";
const router = Router();
router.get("/preview-deployments/project/:projectId", (req: Request, res: Response): void => { res.json(previewDeploymentsService.listByProject(req.params.projectId as string)); });
router.post("/preview-deployments", (req: Request, res: Response): void => { res.status(201).json(previewDeploymentsService.create(req.body)); });
router.get("/preview-deployments/:id", (req: Request, res: Response): void => { const d = previewDeploymentsService.get(req.params.id as string); d ? res.json(d) : res.status(404).json({ error: "Not found" }); });
router.post("/preview-deployments/:id/expire", (req: Request, res: Response): void => { previewDeploymentsService.expire(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
router.delete("/preview-deployments/:id", (req: Request, res: Response): void => { previewDeploymentsService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
