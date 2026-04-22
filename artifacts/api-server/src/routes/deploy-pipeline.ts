import { Router, Request, Response } from "express";
import { deployPipelineService } from "../services/deploy-pipeline";
const router = Router();
router.get("/deploy-pipeline/project/:projectId", (req: Request, res: Response): void => { res.json(deployPipelineService.listByProject(req.params.projectId as string)); });
router.post("/deploy-pipeline", (req: Request, res: Response): void => { res.status(201).json(deployPipelineService.create(req.body)); });
router.get("/deploy-pipeline/:id", (req: Request, res: Response): void => { const p = deployPipelineService.get(req.params.id as string); p ? res.json(p) : res.status(404).json({ error: "Not found" }); });
router.post("/deploy-pipeline/:id/run", (req: Request, res: Response): void => { const p = deployPipelineService.run(req.params.id as string); p ? res.json(p) : res.status(404).json({ error: "Not found" }); });
router.delete("/deploy-pipeline/:id", (req: Request, res: Response): void => { deployPipelineService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
