import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getDefaultAlertRules, getActiveAlerts } from "../services/deploy-alerts";

const router: IRouter = Router();

router.get("/projects/:id/alerts/rules", requireAuth, async (req, res): Promise<void> => {
  try { res.json(getDefaultAlertRules()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/alerts/active", requireAuth, async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getActiveAlerts(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
