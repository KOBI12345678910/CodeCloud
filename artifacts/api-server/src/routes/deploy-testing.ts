import { Router, Request, Response } from "express";
import { deployTestingService } from "../services/deploy-testing";
const router = Router();
router.post("/deploy-testing", (req: Request, res: Response): void => { res.status(201).json(deployTestingService.create(req.body.deploymentId, req.body.type || "smoke")); });
router.get("/deploy-testing/:id", (req: Request, res: Response): void => { const t = deployTestingService.get(req.params.id as string); t ? res.json(t) : res.status(404).json({ error: "Not found" }); });
router.post("/deploy-testing/:id/run", (req: Request, res: Response): void => { const t = deployTestingService.run(req.params.id as string); t ? res.json(t) : res.status(404).json({ error: "Not found" }); });
router.get("/deploy-testing/deployment/:deploymentId", (req: Request, res: Response): void => { res.json(deployTestingService.listByDeployment(req.params.deploymentId as string)); });
export default router;
