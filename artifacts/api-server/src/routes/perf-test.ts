import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { runLighthouseAudit } from "../services/perf-test";

const router: IRouter = Router();

router.post("/perf/audit", requireAuth, async (req, res): Promise<void> => {
  const { url } = req.body;
  if (!url) { res.status(400).json({ error: "url is required" }); return; }
  try { res.json(runLighthouseAudit(url)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
