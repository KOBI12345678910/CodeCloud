import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getSlaDashboard } from "../services/sla-monitor";

const router: IRouter = Router();

router.get("/projects/:id/sla", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getSlaDashboard(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
