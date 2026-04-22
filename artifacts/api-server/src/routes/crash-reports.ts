import { Router, Request, Response } from "express";
import { crashReportsService } from "../services/crash-reports";
const router = Router();
router.get("/crash-reports/project/:projectId", (req: Request, res: Response): void => { res.json(crashReportsService.listByProject(req.params.projectId as string)); });
router.get("/crash-reports/project/:projectId/stats", (req: Request, res: Response): void => { res.json(crashReportsService.getStats(req.params.projectId as string)); });
router.post("/crash-reports", (req: Request, res: Response): void => { res.status(201).json(crashReportsService.report(req.body)); });
router.get("/crash-reports/:id", (req: Request, res: Response): void => { const r = crashReportsService.get(req.params.id as string); r ? res.json(r) : res.status(404).json({ error: "Not found" }); });
router.put("/crash-reports/:id/status", (req: Request, res: Response): void => { const r = crashReportsService.updateStatus(req.params.id as string, req.body.status); r ? res.json(r) : res.status(404).json({ error: "Not found" }); });
export default router;
