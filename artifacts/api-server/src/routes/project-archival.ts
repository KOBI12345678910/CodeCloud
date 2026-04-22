import { Router, Request, Response } from "express";
import { projectArchivalService } from "../services/project-archival";
const router = Router();
router.get("/project-archival", (_req: Request, res: Response): void => { res.json(projectArchivalService.list()); });
router.get("/project-archival/user/:userId", (req: Request, res: Response): void => { res.json(projectArchivalService.listByUser(req.params.userId as string)); });
router.post("/project-archival", (req: Request, res: Response): void => { res.status(201).json(projectArchivalService.archive(req.body)); });
router.get("/project-archival/:id", (req: Request, res: Response): void => { const a = projectArchivalService.get(req.params.id as string); a ? res.json(a) : res.status(404).json({ error: "Not found" }); });
router.post("/project-archival/:id/restore", (req: Request, res: Response): void => { const a = projectArchivalService.restore(req.params.id as string); a ? res.json(a) : res.status(404).json({ error: "Not found" }); });
export default router;
