import { Router, Request, Response } from "express";
import { perfTestingService } from "../services/perf-testing";
const router = Router();
router.get("/perf-testing", (_req: Request, res: Response): void => { res.json(perfTestingService.list()); });
router.post("/perf-testing", (req: Request, res: Response): void => { res.status(201).json(perfTestingService.create(req.body)); });
router.get("/perf-testing/:id", (req: Request, res: Response): void => { const t = perfTestingService.get(req.params.id as string); t ? res.json(t) : res.status(404).json({ error: "Not found" }); });
router.post("/perf-testing/:id/run", (req: Request, res: Response): void => { const t = perfTestingService.run(req.params.id as string); t ? res.json(t) : res.status(404).json({ error: "Not found" }); });
router.delete("/perf-testing/:id", (req: Request, res: Response): void => { perfTestingService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
