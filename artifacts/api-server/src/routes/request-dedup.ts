import { Router, Request, Response } from "express";
import { requestDedupService } from "../services/request-dedup";

const router = Router();

router.post("/request-dedup/check", (req: Request, res: Response): void => {
  const { idempotencyKey, method, path, body } = req.body;
  if (!idempotencyKey) { res.status(400).json({ error: "idempotencyKey required" }); return; }
  const hash = requestDedupService.generateHash(method || "POST", path || "/", body);
  const existing = requestDedupService.check(idempotencyKey, hash);
  if (existing) {
    res.json({ duplicate: true, cachedResponse: existing.response, hitCount: existing.hitCount });
  } else {
    res.json({ duplicate: false, hash });
  }
});

router.post("/request-dedup/store", (req: Request, res: Response): void => {
  const { idempotencyKey, hash, status, body, ttl } = req.body;
  if (!idempotencyKey || !hash) { res.status(400).json({ error: "idempotencyKey and hash required" }); return; }
  res.json(requestDedupService.store(idempotencyKey, hash, status || 200, body || {}, ttl));
});

router.get("/request-dedup/:key", (req: Request, res: Response): void => {
  const entry = requestDedupService.get(req.params.key as string);
  if (!entry) { res.status(404).json({ error: "Not found or expired" }); return; }
  res.json(entry);
});

router.delete("/request-dedup/:key", (req: Request, res: Response): void => {
  if (!requestDedupService.invalidate(req.params.key as string)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

router.get("/request-dedup-metrics", (_req: Request, res: Response): void => {
  res.json(requestDedupService.getMetrics());
});

router.post("/request-dedup/flush", (_req: Request, res: Response): void => {
  const flushed = requestDedupService.flush();
  res.json({ flushed });
});

export default router;
