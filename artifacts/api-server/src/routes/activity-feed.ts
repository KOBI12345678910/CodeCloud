import { Router, Request, Response } from "express";
import { activityFeedService } from "../services/activity-feed";
const router = Router();
router.get("/activity-feed", (req: Request, res: Response): void => { res.json(activityFeedService.getGlobal(Number(req.query.limit) || 50)); });
router.get("/activity-feed/user/:userId", (req: Request, res: Response): void => { res.json(activityFeedService.getByUser(req.params.userId as string, Number(req.query.limit) || 50)); });
router.get("/activity-feed/project/:projectId", (req: Request, res: Response): void => { res.json(activityFeedService.getByProject(req.params.projectId as string, Number(req.query.limit) || 50)); });
router.get("/activity-feed/type/:type", (req: Request, res: Response): void => { res.json(activityFeedService.getByType(req.params.type as any, Number(req.query.limit) || 50)); });
router.post("/activity-feed", (req: Request, res: Response): void => { res.status(201).json(activityFeedService.add(req.body)); });
export default router;
