import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getWafStats, toggleWafRule } from "../services/waf";

const router: IRouter = Router();

router.get("/projects/:id/waf", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getWafStats(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/projects/:id/waf/:ruleId/toggle", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const ruleId = Array.isArray(req.params.ruleId) ? req.params.ruleId[0] : req.params.ruleId;
  try { res.json(toggleWafRule(ruleId, req.body.enabled)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
