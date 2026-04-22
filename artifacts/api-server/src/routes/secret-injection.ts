import { Router, Request, Response } from "express";
import { secretInjectionService } from "../services/secret-injection";

const router = Router();

router.post("/secrets/inject", (req: Request, res: Response): void => {
  const { containerId, key, value, actor } = req.body;
  if (!containerId || !key || !value) { res.status(400).json({ error: "containerId, key, value required" }); return; }
  const secret = secretInjectionService.inject(containerId, key, value, actor || "system");
  res.status(201).json(secret);
});

router.get("/secrets/:containerId", (req: Request, res: Response): void => {
  res.json({ secrets: secretInjectionService.getSecrets(req.params.containerId as string) });
});

router.post("/secrets/:secretId/rotate", (req: Request, res: Response): void => {
  const { newValue, actor } = req.body;
  if (!newValue) { res.status(400).json({ error: "newValue required" }); return; }
  const result = secretInjectionService.rotate(req.params.secretId as string, newValue, actor || "system");
  if (!result) { res.status(404).json({ error: "Secret not found" }); return; }
  res.json(result);
});

router.delete("/secrets/:secretId", (req: Request, res: Response): void => {
  const deleted = secretInjectionService.delete(req.params.secretId as string, (req.query.actor as string) || "system");
  if (!deleted) { res.status(404).json({ error: "Secret not found" }); return; }
  res.json({ success: true });
});

router.post("/secrets/mask-logs", (req: Request, res: Response): void => {
  const { log, containerId } = req.body;
  if (!log || !containerId) { res.status(400).json({ error: "log and containerId required" }); return; }
  res.json({ masked: secretInjectionService.maskInLogs(log, containerId) });
});

router.get("/secrets/:secretId/audit", (req: Request, res: Response): void => {
  res.json({ entries: secretInjectionService.getAuditLog(req.params.secretId as string) });
});

export default router;
