import { Router, Request, Response } from "express";
import { layoutPresetsService } from "../services/layout-presets";
const router = Router();
router.get("/layout-presets", (_req: Request, res: Response): void => { res.json(layoutPresetsService.list()); });
router.get("/layout-presets/:id", (req: Request, res: Response): void => { const p = layoutPresetsService.get(req.params.id as string); p ? res.json(p) : res.status(404).json({ error: "Not found" }); });
router.post("/layout-presets", (req: Request, res: Response): void => { res.status(201).json(layoutPresetsService.create(req.body)); });
router.put("/layout-presets/:id", (req: Request, res: Response): void => { const p = layoutPresetsService.update(req.params.id as string, req.body); p ? res.json(p) : res.status(404).json({ error: "Not found" }); });
router.delete("/layout-presets/:id", (req: Request, res: Response): void => { layoutPresetsService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found or default preset" }); });
export default router;
