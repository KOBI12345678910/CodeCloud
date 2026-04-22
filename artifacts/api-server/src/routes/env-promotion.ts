import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getPipeline, approvePromotion, rejectPromotion, executePromotion, rollbackPromotion } from "../services/env-promotion";

const router: IRouter = Router();

router.get("/env-promotion/pipeline", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(getPipeline()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/env-promotion/:id/approve", requireAuth, async (req, res): Promise<void> => {
  const result = approvePromotion(req.params.id as string, (req as any).userId || "admin");
  if (!result) { res.status(400).json({ error: "Cannot approve" }); return; }
  res.json(result);
});

router.post("/env-promotion/:id/reject", requireAuth, async (req, res): Promise<void> => {
  const result = rejectPromotion(req.params.id as string);
  if (!result) { res.status(400).json({ error: "Cannot reject" }); return; }
  res.json(result);
});

router.post("/env-promotion/:id/execute", requireAuth, async (req, res): Promise<void> => {
  const result = executePromotion(req.params.id as string);
  if (!result) { res.status(400).json({ error: "Cannot execute" }); return; }
  res.json(result);
});

router.post("/env-promotion/:id/rollback", requireAuth, async (req, res): Promise<void> => {
  const result = rollbackPromotion(req.params.id as string);
  if (!result) { res.status(400).json({ error: "Cannot rollback" }); return; }
  res.json(result);
});

export default router;
