import { Router, Request, Response } from "express";
import { templateVersioningService } from "../services/template-versioning";
const router = Router();
router.get("/template-versioning/:templateId", (req: Request, res: Response): void => { res.json(templateVersioningService.getVersions(req.params.templateId as string)); });
router.get("/template-versioning/:templateId/latest", (req: Request, res: Response): void => { const v = templateVersioningService.getLatest(req.params.templateId as string); v ? res.json(v) : res.status(404).json({ error: "No versions" }); });
router.post("/template-versioning", (req: Request, res: Response): void => { const { templateId, version, changelog, files, createdBy } = req.body; res.status(201).json(templateVersioningService.addVersion(templateId, version, changelog, files || [], createdBy)); });
router.post("/template-versioning/diff", (req: Request, res: Response): void => { const { templateId, v1, v2 } = req.body; res.json(templateVersioningService.diff(templateId, v1, v2)); });
export default router;
