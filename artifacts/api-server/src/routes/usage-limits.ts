import { Router, Request, Response } from "express";
import { usageLimitsService } from "../services/usage-limits";
const router = Router();
router.get("/usage-limits/plans", (_req: Request, res: Response): void => { res.json(usageLimitsService.getAllLimits()); });
router.get("/usage-limits/plans/:plan", (req: Request, res: Response): void => { const l = usageLimitsService.getLimits(req.params.plan as string); l ? res.json(l) : res.status(404).json({ error: "Not found" }); });
router.get("/usage-limits/:userId", (req: Request, res: Response): void => { res.json(usageLimitsService.getUsage(req.params.userId as string)); });
router.post("/usage-limits/check", (req: Request, res: Response): void => { res.json(usageLimitsService.checkLimit(req.body.userId, req.body.plan, req.body.resource)); });
router.post("/usage-limits/:userId/record", (req: Request, res: Response): void => { res.json(usageLimitsService.recordUsage(req.params.userId as string, req.body.resource, req.body.amount)); });
export default router;
