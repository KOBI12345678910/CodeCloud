import { Router, Request, Response } from "express";
import { costOptimizerService } from "../services/cost-optimizer";
const router = Router();
router.get("/cost-optimizer/:projectId", (req: Request, res: Response): void => { res.json(costOptimizerService.getCosts(req.params.projectId as string)); });
router.get("/cost-optimizer/:projectId/recommendations", (req: Request, res: Response): void => { res.json(costOptimizerService.getRecommendations(req.params.projectId as string)); });
router.get("/cost-optimizer/:projectId/forecast", (req: Request, res: Response): void => { res.json(costOptimizerService.forecast(req.params.projectId as string, Number(req.query.months) || 3)); });
export default router;
