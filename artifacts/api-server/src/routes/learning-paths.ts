import { Router, Request, Response } from "express";
import { learningPathsService } from "../services/learning-paths";
const router = Router();
router.get("/learning-paths", (_req: Request, res: Response): void => { res.json(learningPathsService.list()); });
router.get("/learning-paths/:id", (req: Request, res: Response): void => { const p = learningPathsService.get(req.params.id as string); p ? res.json(p) : res.status(404).json({ error: "Not found" }); });
router.get("/learning-paths/:pathId/progress/:userId", (req: Request, res: Response): void => { const p = learningPathsService.getProgress(req.params.userId as string, req.params.pathId as string); p ? res.json(p) : res.json({ completedLessons: [] }); });
router.post("/learning-paths/:pathId/complete/:lessonId", (req: Request, res: Response): void => { res.json(learningPathsService.completeLesson(req.body.userId, req.params.pathId as string, req.params.lessonId as string)); });
export default router;
