import { Router, Request, Response } from "express";
import { projectSecretsService } from "../services/project-secrets";
const router = Router();
router.get("/project-secrets/:projectId", (req: Request, res: Response): void => { res.json(projectSecretsService.list(req.params.projectId as string)); });
router.post("/project-secrets/:projectId", (req: Request, res: Response): void => { res.status(201).json(projectSecretsService.set(req.params.projectId as string, req.body.key, req.body.value, req.body.description || "", req.body.createdBy || "system")); });
router.delete("/project-secrets/:projectId/:key", (req: Request, res: Response): void => { projectSecretsService.delete(req.params.projectId as string, req.params.key as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
