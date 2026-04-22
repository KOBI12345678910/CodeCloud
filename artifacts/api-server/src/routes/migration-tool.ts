import { Router, Request, Response } from "express";
import { migrationToolService } from "../services/migration-tool";
const router = Router();
router.get("/migration-tool", (_req: Request, res: Response): void => { res.json(migrationToolService.listPlans()); });
router.post("/migration-tool", (req: Request, res: Response): void => { res.status(201).json(migrationToolService.createPlan(req.body.source, req.body.target)); });
router.get("/migration-tool/:id", (req: Request, res: Response): void => { const p = migrationToolService.getPlan(req.params.id as string); p ? res.json(p) : res.status(404).json({ error: "Not found" }); });
router.post("/migration-tool/:id/execute", (req: Request, res: Response): void => { const p = migrationToolService.execute(req.params.id as string); p ? res.json(p) : res.status(404).json({ error: "Not found" }); });
router.delete("/migration-tool/:id", (req: Request, res: Response): void => { migrationToolService.deletePlan(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
