import { Router, Request, Response } from "express";
import { timeTrackingService } from "../services/time-tracking";
const router = Router();
router.post("/time-tracking", (req: Request, res: Response): void => { const { userId, projectId, file, language, durationSeconds } = req.body; res.status(201).json(timeTrackingService.record(userId, projectId, file, language, durationSeconds)); });
router.get("/time-tracking/:userId", (req: Request, res: Response): void => { res.json(timeTrackingService.getSummary(req.params.userId as string, req.query.projectId as string, Number(req.query.days) || 7)); });
router.get("/time-tracking/:userId/entries", (req: Request, res: Response): void => { res.json(timeTrackingService.getEntries(req.params.userId as string, Number(req.query.limit) || 50)); });
export default router;
