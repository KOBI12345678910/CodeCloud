import { Router, Request, Response } from "express";
import { embedWidgetService } from "../services/embed-widget";
const router = Router();
router.get("/embed-widget", (_req: Request, res: Response): void => { res.json(embedWidgetService.list()); });
router.post("/embed-widget", (req: Request, res: Response): void => { res.status(201).json(embedWidgetService.createEmbed(req.body)); });
router.get("/embed-widget/:id", (req: Request, res: Response): void => { const e = embedWidgetService.getEmbed(req.params.id as string); e ? res.json(e) : res.status(404).json({ error: "Not found" }); });
router.put("/embed-widget/:id", (req: Request, res: Response): void => { const e = embedWidgetService.updateEmbed(req.params.id as string, req.body); e ? res.json(e) : res.status(404).json({ error: "Not found" }); });
router.delete("/embed-widget/:id", (req: Request, res: Response): void => { embedWidgetService.deleteEmbed(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
