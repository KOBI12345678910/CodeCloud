import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getFunnelData } from "../services/funnel-analytics";

const router: IRouter = Router();

router.get("/analytics/funnel", requireAuth, async (req, res): Promise<void> => {
  const period = (req.query.period as string) || "30d";
  try { res.json(getFunnelData(period)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
