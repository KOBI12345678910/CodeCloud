import { Router, Request, Response } from "express";
import { webhookRetryService } from "../services/webhook-retry";

const router = Router();

router.get("/webhook-retry/policies", (_req: Request, res: Response): void => {
  res.json({ policies: webhookRetryService.getPolicies() });
});

router.post("/webhook-retry/policies", (req: Request, res: Response): void => {
  const { webhookUrl, maxRetries, backoffType, initialDelayMs, maxDelayMs, enabled } = req.body;
  if (!webhookUrl) { res.status(400).json({ error: "webhookUrl required" }); return; }
  res.status(201).json(webhookRetryService.createPolicy({ webhookUrl, maxRetries: maxRetries || 3, backoffType: backoffType || "exponential", initialDelayMs: initialDelayMs || 1000, maxDelayMs: maxDelayMs || 60000, enabled: enabled ?? true }));
});

router.post("/webhook-retry/enqueue", (req: Request, res: Response): void => {
  const { policyId, payload } = req.body;
  if (!policyId) { res.status(400).json({ error: "policyId required" }); return; }
  res.status(201).json(webhookRetryService.enqueue(policyId, payload || {}));
});

router.post("/webhook-retry/deliveries/:id/attempt", (req: Request, res: Response): void => {
  const { success, responseCode, error } = req.body;
  const result = webhookRetryService.recordAttempt(req.params.id as string, success, responseCode, error);
  if (!result) { res.status(404).json({ error: "Delivery not found" }); return; }
  res.json(result);
});

router.post("/webhook-retry/deliveries/:id/retry", (req: Request, res: Response): void => {
  const result = webhookRetryService.retryManual(req.params.id as string);
  if (!result) { res.status(404).json({ error: "Delivery not found" }); return; }
  res.json(result);
});

router.get("/webhook-retry/deliveries", (req: Request, res: Response): void => {
  res.json({ deliveries: webhookRetryService.getDeliveries(req.query.policyId as string, req.query.status as string) });
});

router.get("/webhook-retry/dead-letter", (_req: Request, res: Response): void => {
  res.json({ queue: webhookRetryService.getDeadLetterQueue() });
});

router.get("/webhook-retry/stats", (_req: Request, res: Response): void => {
  res.json(webhookRetryService.getStats());
});

export default router;
