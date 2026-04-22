import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getTrafficRules, createTrafficRule, toggleTrafficRule } from "../services/traffic-shaping";

const router: IRouter = Router();

router.get("/projects/:id/traffic-rules", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getTrafficRules(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/traffic-rules", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.status(201).json(createTrafficRule(projectId, req.body)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/projects/:id/traffic-rules/:ruleId/toggle", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const ruleId = Array.isArray(req.params.ruleId) ? req.params.ruleId[0] : req.params.ruleId;
  try { res.json(toggleTrafficRule(ruleId, req.body.enabled)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
