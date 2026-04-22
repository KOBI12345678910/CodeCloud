import { Router, Request, Response } from "express";
import { blueGreenService } from "../services/blue-green";

const router = Router();

router.get("/blue-green", (_req: Request, res: Response): void => {
  res.json({ deployments: blueGreenService.getAll() });
});

router.post("/blue-green", (req: Request, res: Response): void => {
  const { projectId, blueVersion, greenVersion } = req.body;
  if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
  res.status(201).json(blueGreenService.create(projectId, blueVersion || "v1", greenVersion || "v2"));
});

router.get("/blue-green/:id", (req: Request, res: Response): void => {
  const dep = blueGreenService.get(req.params.id as string);
  if (!dep) { res.status(404).json({ error: "Deployment not found" }); return; }
  res.json(dep);
});

router.post("/blue-green/:id/switch", (req: Request, res: Response): void => {
  const { reason } = req.body;
  const event = blueGreenService.switchTraffic(req.params.id as string, reason || "Manual switch");
  if (!event) { res.status(404).json({ error: "Deployment not found" }); return; }
  res.json(event);
});

router.post("/blue-green/:id/split", (req: Request, res: Response): void => {
  const { bluePct } = req.body;
  const dep = blueGreenService.setTrafficSplit(req.params.id as string, bluePct ?? 50);
  if (!dep) { res.status(404).json({ error: "Deployment not found" }); return; }
  res.json(dep);
});

router.post("/blue-green/:id/rollback", (req: Request, res: Response): void => {
  const event = blueGreenService.rollback(req.params.id as string);
  if (!event) { res.status(404).json({ error: "Deployment not found" }); return; }
  res.json(event);
});

router.post("/blue-green/:id/health", (req: Request, res: Response): void => {
  const { slot, health } = req.body;
  const dep = blueGreenService.updateHealth(req.params.id as string, slot, health);
  if (!dep) { res.status(404).json({ error: "Deployment not found" }); return; }
  res.json(dep);
});

router.get("/blue-green/:id/events", (req: Request, res: Response): void => {
  res.json({ events: blueGreenService.getEvents(req.params.id as string) });
});

export default router;
