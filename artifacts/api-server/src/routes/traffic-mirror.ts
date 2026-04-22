import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getConfigs, getSessions, getComparisons, toggleConfig, updateSampleRate } from "../services/traffic-mirror";

const router: IRouter = Router();

router.get("/traffic-mirror/configs", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(getConfigs()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/traffic-mirror/sessions", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(getSessions()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/traffic-mirror/comparisons/:sessionId", requireAuth, async (req, res): Promise<void> => {
  const sessionId = req.params.sessionId as string;
  try { res.json(getComparisons(sessionId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/traffic-mirror/configs/:id/toggle", requireAuth, async (req, res): Promise<void> => {
  const id = req.params.id as string;
  const result = toggleConfig(id);
  if (!result) { res.status(404).json({ error: "Config not found" }); return; }
  res.json(result);
});

router.patch("/traffic-mirror/configs/:id/sample-rate", requireAuth, async (req, res): Promise<void> => {
  const id = req.params.id as string;
  const { rate } = req.body;
  if (typeof rate !== "number") { res.status(400).json({ error: "rate required" }); return; }
  const result = updateSampleRate(id, rate);
  if (!result) { res.status(404).json({ error: "Config not found" }); return; }
  res.json(result);
});

export default router;
