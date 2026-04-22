import { Router, Request, Response } from "express";
import { projectAnalyticsService } from "../services/project-analytics";
const router = Router();
router.get("/project-analytics/:projectId", (req: Request, res: Response): void => { res.json(projectAnalyticsService.getStats(req.params.projectId as string)); });
router.post("/project-analytics/:projectId/edit", (req: Request, res: Response): void => { projectAnalyticsService.recordEdit(req.params.projectId as string); res.json({ success: true }); });
router.post("/project-analytics/:projectId/build", (req: Request, res: Response): void => { projectAnalyticsService.recordBuild(req.params.projectId as string); res.json({ success: true }); });
router.post("/project-analytics/:projectId/deploy", (req: Request, res: Response): void => { projectAnalyticsService.recordDeploy(req.params.projectId as string); res.json({ success: true }); });
router.get("/project-analytics/top/projects", (_req: Request, res: Response): void => { res.json(projectAnalyticsService.getTopProjects()); });
export default router;
