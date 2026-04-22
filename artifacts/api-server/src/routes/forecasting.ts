import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getResourceForecast } from "../services/forecasting";

const router: IRouter = Router();

router.get("/projects/:id/forecast", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const days = parseInt(req.query.days as string) || 30;
  try { res.json(getResourceForecast(projectId, days)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
