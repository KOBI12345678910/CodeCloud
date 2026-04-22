import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getWarmPools, updatePoolConfig } from "../services/warm-pool";

const router: IRouter = Router();

router.get("/admin/warm-pools", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(getWarmPools()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/admin/warm-pools/:language", requireAuth, async (req, res): Promise<void> => {
  const language = decodeURIComponent(Array.isArray(req.params.language) ? req.params.language[0] : req.params.language);
  try { res.json(updatePoolConfig(language, req.body)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
