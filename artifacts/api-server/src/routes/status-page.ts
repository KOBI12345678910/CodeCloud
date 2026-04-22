import { Router, Request, Response } from "express";
import { statusPageService } from "../services/status-page";
const router = Router();
router.get("/status-page", (_req: Request, res: Response): void => { res.json(statusPageService.getPage()); });
router.get("/status-page/services", (_req: Request, res: Response): void => { res.json(statusPageService.listServices()); });
router.get("/status-page/services/:name", (req: Request, res: Response): void => { const s = statusPageService.getService(req.params.name as string); s ? res.json(s) : res.status(404).json({ error: "Not found" }); });
router.put("/status-page/services/:name", (req: Request, res: Response): void => { const s = statusPageService.updateService(req.params.name as string, req.body.status, req.body.responseTime); s ? res.json(s) : res.status(404).json({ error: "Not found" }); });
export default router;
