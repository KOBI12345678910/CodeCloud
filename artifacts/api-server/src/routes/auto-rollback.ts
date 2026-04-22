import { Router, Request, Response } from "express";
import { autoRollbackService } from "../services/auto-rollback";

const router = Router();

router.get("/auto-rollback/triggers", (req: Request, res: Response): void => {
  res.json({ triggers: autoRollbackService.getTriggers(req.query.deploymentId as string) });
});

router.post("/auto-rollback/triggers", (req: Request, res: Response): void => {
  const { deploymentId, type, threshold } = req.body;
  if (!deploymentId || !type || threshold === undefined) { res.status(400).json({ error: "deploymentId, type, threshold required" }); return; }
  res.status(201).json(autoRollbackService.createTrigger(deploymentId, type, threshold));
});

router.put("/auto-rollback/triggers/:id", (req: Request, res: Response): void => {
  const t = autoRollbackService.updateTrigger(req.params.id as string, req.body);
  if (!t) { res.status(404).json({ error: "Not found" }); return; }
  res.json(t);
});

router.delete("/auto-rollback/triggers/:id", (req: Request, res: Response): void => {
  if (!autoRollbackService.deleteTrigger(req.params.id as string)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

router.post("/auto-rollback/check", (req: Request, res: Response): void => {
  const { deploymentId, metrics } = req.body;
  const event = autoRollbackService.checkAndRollback(deploymentId, metrics);
  res.json({ triggered: !!event, event });
});

router.get("/auto-rollback/events", (req: Request, res: Response): void => {
  res.json({ events: autoRollbackService.getEvents(req.query.deploymentId as string) });
});

export default router;
