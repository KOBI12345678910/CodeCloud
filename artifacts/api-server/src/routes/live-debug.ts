import { Router, Request, Response } from "express";
import { liveDebugService } from "../services/live-debug";

const router = Router();

router.post("/debug/attach", (req: Request, res: Response): void => {
  const { containerId } = req.body;
  if (!containerId) { res.status(400).json({ error: "containerId required" }); return; }
  res.status(201).json(liveDebugService.attach(containerId));
});

router.get("/debug/sessions", (_req: Request, res: Response): void => {
  res.json({ sessions: liveDebugService.getSessions() });
});

router.get("/debug/sessions/:id", (req: Request, res: Response): void => {
  const s = liveDebugService.get(req.params.id as string);
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  res.json(s);
});

router.post("/debug/sessions/:id/detach", (req: Request, res: Response): void => {
  if (!liveDebugService.detach(req.params.id as string)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

router.post("/debug/sessions/:id/breakpoints", (req: Request, res: Response): void => {
  const { file, line, condition } = req.body;
  const bp = liveDebugService.addBreakpoint(req.params.id as string, file, line, condition);
  if (!bp) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(bp);
});

router.delete("/debug/sessions/:id/breakpoints/:bpId", (req: Request, res: Response): void => {
  if (!liveDebugService.removeBreakpoint(req.params.id as string, req.params.bpId as string)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

router.post("/debug/sessions/:id/evaluate", (req: Request, res: Response): void => {
  const { expression } = req.body;
  const result = liveDebugService.evaluate(req.params.id as string, expression);
  if (!result) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(result);
});

router.post("/debug/sessions/:id/step", (req: Request, res: Response): void => {
  const s = liveDebugService.stepOver(req.params.id as string);
  if (!s) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(s);
});

export default router;
