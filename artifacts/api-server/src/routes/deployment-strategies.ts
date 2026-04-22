import { Router, Request, Response } from "express";
import { deploymentStrategiesService } from "../services/deployment-strategies";
const router = Router();
router.get("/deployment-strategies/:projectId", (req: Request, res: Response): void => { const s = deploymentStrategiesService.getStrategy(req.params.projectId as string); s ? res.json(s) : res.json({ type: "rolling", active: false }); });
router.post("/deployment-strategies", (req: Request, res: Response): void => { res.status(201).json(deploymentStrategiesService.setStrategy(req.body)); });
router.get("/deployment-strategies/:projectId/autoscale", (req: Request, res: Response): void => { const s = deploymentStrategiesService.getAutoScale(req.params.projectId as string); s ? res.json(s) : res.json({ configured: false }); });
router.post("/deployment-strategies/autoscale", (req: Request, res: Response): void => { res.status(201).json(deploymentStrategiesService.configureAutoScale(req.body)); });
export default router;
