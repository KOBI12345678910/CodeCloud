import { Router, Request, Response } from "express";
import { reviewAutomationService } from "../services/review-automation";

const router = Router();

router.post("/review/assign", (req: Request, res: Response): void => {
  const { prId, changedFiles } = req.body;
  if (!prId || !changedFiles) { res.status(400).json({ error: "prId and changedFiles required" }); return; }
  res.json({ assignments: reviewAutomationService.assignReviewers(prId, changedFiles) });
});

router.get("/review/assignments", (req: Request, res: Response): void => {
  res.json({ assignments: reviewAutomationService.getAssignments(req.query.prId as string) });
});

router.put("/review/assignments/:id/status", (req: Request, res: Response): void => {
  const { status } = req.body;
  if (!reviewAutomationService.updateStatus(req.params.id as string, status)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

router.post("/review/assignments/:id/remind", (req: Request, res: Response): void => {
  if (!reviewAutomationService.sendReminder(req.params.id as string)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

router.get("/review/analytics", (_req: Request, res: Response): void => {
  res.json(reviewAutomationService.getAnalytics());
});

export default router;
