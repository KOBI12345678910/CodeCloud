import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { queueManager } from "../services/queue-manager";

const router: IRouter = Router();

const requireAdmin = async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): Promise<void> => {
  const user = (req as any).user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

router.get("/queues", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  res.json(queueManager.getDashboard());
});

router.get("/queues/:name", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const stats = queueManager.getQueueStats(req.params.name);
  if (!stats) { res.status(404).json({ error: "Queue not found" }); return; }
  res.json(stats);
});

router.get("/queues/:name/jobs", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const status = req.query.status as any;
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ jobs: queueManager.getJobs(req.params.name, status, limit) });
});

router.post("/queues/:name/jobs", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { name: jobName, data } = req.body;
  if (!jobName) { res.status(400).json({ error: "Job name required" }); return; }
  const job = queueManager.addJob(req.params.name, jobName, data || {});
  res.status(201).json(job);
});

router.get("/queues/jobs/:jobId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const job = queueManager.getJob(req.params.jobId);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(job);
});

router.post("/queues/jobs/:jobId/retry", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  res.json(queueManager.retryJob(req.params.jobId));
});

router.post("/queues/jobs/:jobId/dlq", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  res.json(queueManager.moveToDlq(req.params.jobId));
});

router.get("/queues/dead-letter/all", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ jobs: queueManager.getDeadLetterJobs(limit) });
});

router.delete("/queues/:name/purge", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const status = req.query.status as any;
  res.json(queueManager.purgeQueue(req.params.name, status));
});

export default router;
