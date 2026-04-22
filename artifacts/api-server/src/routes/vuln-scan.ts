import { Router, Request, Response } from "express";
import { vulnScanService } from "../services/vuln-scan";
const router = Router();
router.post("/vuln-scan", (req: Request, res: Response): void => { res.json(vulnScanService.scan(req.body.imageId, req.body.imageName)); });
router.get("/vuln-scan/:imageId", (req: Request, res: Response): void => { const r = vulnScanService.getResult(req.params.imageId as string); r ? res.json(r) : res.status(404).json({ error: "Not found" }); });
router.get("/vuln-scan", (_req: Request, res: Response): void => { res.json(vulnScanService.listScans()); });
export default router;
