import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getEvents, getRules, getIntegrityChecks, addRule, toggleRule, deleteRule } from "../services/fs-monitor";

const router: IRouter = Router();

router.get("/projects/:projectId/fs-monitor/events", requireAuth, async (req, res): Promise<void> => {
  try { res.json(getEvents(req.params.projectId as string)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:projectId/fs-monitor/rules", requireAuth, async (req, res): Promise<void> => {
  try { res.json(getRules(req.params.projectId as string)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:projectId/fs-monitor/integrity", requireAuth, async (req, res): Promise<void> => {
  try { res.json(getIntegrityChecks(req.params.projectId as string)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:projectId/fs-monitor/rules", requireAuth, async (req, res): Promise<void> => {
  try { res.json(addRule(req.params.projectId as string, req.body)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:projectId/fs-monitor/rules/:ruleId/toggle", requireAuth, async (req, res): Promise<void> => {
  const result = toggleRule(req.params.projectId as string, req.params.ruleId as string);
  if (!result) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json(result);
});

router.delete("/projects/:projectId/fs-monitor/rules/:ruleId", requireAuth, async (req, res): Promise<void> => {
  const ok = deleteRule(req.params.projectId as string, req.params.ruleId as string);
  if (!ok) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json({ success: true });
});

export default router;
