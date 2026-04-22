import { Router, Request, Response } from "express";
import { errorAlertingService } from "../services/error-alerting";

const router = Router();

router.get("/error-alerting/rules", (_req: Request, res: Response): void => {
  res.json({ rules: errorAlertingService.getRules() });
});

router.post("/error-alerting/rules", (req: Request, res: Response): void => {
  const { name, type, condition, channels, enabled, cooldownMinutes } = req.body;
  if (!name || !type) { res.status(400).json({ error: "name and type required" }); return; }
  res.status(201).json(errorAlertingService.createRule({ name, type, condition: condition || {}, channels: channels || ["slack"], enabled: enabled ?? true, cooldownMinutes: cooldownMinutes || 15 }));
});

router.put("/error-alerting/rules/:id", (req: Request, res: Response): void => {
  const result = errorAlertingService.updateRule(req.params.id as string, req.body);
  if (!result) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json(result);
});

router.post("/error-alerting/check", (req: Request, res: Response): void => {
  const { errorType, message } = req.body;
  if (!errorType) { res.status(400).json({ error: "errorType required" }); return; }
  res.json({ alerts: errorAlertingService.checkError(errorType, message || "") });
});

router.get("/error-alerting/alerts", (req: Request, res: Response): void => {
  const ack = req.query.acknowledged === "true" ? true : req.query.acknowledged === "false" ? false : undefined;
  res.json({ alerts: errorAlertingService.getAlerts(ack) });
});

router.post("/error-alerting/alerts/:id/acknowledge", (req: Request, res: Response): void => {
  if (!errorAlertingService.acknowledgeAlert(req.params.id as string)) { res.status(404).json({ error: "Alert not found" }); return; }
  res.json({ success: true });
});

router.post("/error-alerting/alerts/:id/resolve", (req: Request, res: Response): void => {
  if (!errorAlertingService.resolveAlert(req.params.id as string)) { res.status(404).json({ error: "Alert not found" }); return; }
  res.json({ success: true });
});

router.get("/error-alerting/rotations", (_req: Request, res: Response): void => {
  res.json({ rotations: errorAlertingService.getRotations() });
});

router.post("/error-alerting/rotations", (req: Request, res: Response): void => {
  const { name, members, rotationHours } = req.body;
  if (!name || !members) { res.status(400).json({ error: "name and members required" }); return; }
  res.status(201).json(errorAlertingService.createRotation({ name, members, rotationHours: rotationHours || 168 }));
});

router.get("/error-alerting/rotations/:id/on-call", (req: Request, res: Response): void => {
  const onCall = errorAlertingService.getCurrentOnCall(req.params.id as string);
  if (!onCall) { res.status(404).json({ error: "Rotation not found" }); return; }
  res.json(onCall);
});

export default router;
