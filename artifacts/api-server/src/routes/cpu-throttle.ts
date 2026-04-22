import { Router, Request, Response } from "express";
import { cpuThrottleService } from "../services/cpu-throttle";

const router = Router();

router.get("/cpu-throttle", (_req: Request, res: Response): void => {
  res.json({ allocations: cpuThrottleService.getAllocations() });
});

router.post("/cpu-throttle/allocate", (req: Request, res: Response): void => {
  const { containerId, containerName, maxCores, priority } = req.body;
  if (!containerId || !containerName) { res.status(400).json({ error: "containerId and containerName required" }); return; }
  res.status(201).json(cpuThrottleService.allocate(containerId, containerName, maxCores || 2, priority || "normal"));
});

router.post("/cpu-throttle/:containerId/usage", (req: Request, res: Response): void => {
  const { cpuPercent } = req.body;
  const result = cpuThrottleService.updateUsage(req.params.containerId as string, cpuPercent || 0);
  if (!result) { res.status(404).json({ error: "Container not found" }); return; }
  res.json(result);
});

router.put("/cpu-throttle/:containerId/priority", (req: Request, res: Response): void => {
  const { priority } = req.body;
  const result = cpuThrottleService.setPriority(req.params.containerId as string, priority);
  if (!result) { res.status(404).json({ error: "Container not found" }); return; }
  res.json(result);
});

router.post("/cpu-throttle/:containerId/credits", (req: Request, res: Response): void => {
  const { amount } = req.body;
  const result = cpuThrottleService.addCredits(req.params.containerId as string, amount || 10);
  if (!result) { res.status(404).json({ error: "Container not found" }); return; }
  res.json(result);
});

router.get("/cpu-throttle/events", (req: Request, res: Response): void => {
  const containerId = req.query.containerId as string | undefined;
  res.json({ events: cpuThrottleService.getEvents(containerId) });
});

export default router;
