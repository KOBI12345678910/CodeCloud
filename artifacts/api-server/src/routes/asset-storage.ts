import { Router, Request, Response } from "express";
import { assetStorageService } from "../services/asset-storage";
const router = Router();
router.get("/asset-storage/project/:projectId", (req: Request, res: Response): void => { res.json(assetStorageService.listByProject(req.params.projectId as string)); });
router.get("/asset-storage/project/:projectId/usage", (req: Request, res: Response): void => { res.json(assetStorageService.getProjectUsage(req.params.projectId as string)); });
router.post("/asset-storage", (req: Request, res: Response): void => { res.status(201).json(assetStorageService.upload(req.body)); });
router.get("/asset-storage/:id", (req: Request, res: Response): void => { const a = assetStorageService.get(req.params.id as string); a ? res.json(a) : res.status(404).json({ error: "Not found" }); });
router.delete("/asset-storage/:id", (req: Request, res: Response): void => { assetStorageService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
