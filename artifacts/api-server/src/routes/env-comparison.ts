import { Router, Request, Response } from "express";
import { envComparisonService } from "../services/env-comparison";
const router = Router();
router.get("/env-comparison", (_req: Request, res: Response): void => { res.json(envComparisonService.listEnvironments()); });
router.get("/env-comparison/:name", (req: Request, res: Response): void => { res.json(envComparisonService.getEnv(req.params.name as string)); });
router.post("/env-comparison", (req: Request, res: Response): void => { const { name, vars } = req.body; envComparisonService.setEnv(name, vars || []); res.json({ success: true }); });
router.post("/env-comparison/compare", (req: Request, res: Response): void => { const { env1, env2 } = req.body; res.json(envComparisonService.compare(env1, env2)); });
export default router;
