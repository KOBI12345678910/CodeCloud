import { Router, Request, Response } from "express";
import { featureFlagsService } from "../services/feature-flags";
const router = Router();
router.get("/feature-flags", (_req: Request, res: Response): void => { res.json(featureFlagsService.list()); });
router.post("/feature-flags", (req: Request, res: Response): void => { res.status(201).json(featureFlagsService.create(req.body)); });
router.get("/feature-flags/check/:name", (req: Request, res: Response): void => { res.json({ enabled: featureFlagsService.isEnabled(req.params.name as string, req.query.userId as string, req.query.plan as string) }); });
router.put("/feature-flags/:id", (req: Request, res: Response): void => { const f = featureFlagsService.update(req.params.id as string, req.body); f ? res.json(f) : res.status(404).json({ error: "Not found" }); });
router.delete("/feature-flags/:id", (req: Request, res: Response): void => { featureFlagsService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
