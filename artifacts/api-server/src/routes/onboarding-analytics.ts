import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getOnboardingFunnel, trackOnboardingEvent } from "../services/onboarding-analytics";

const router: IRouter = Router();

router.get("/analytics/onboarding", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(getOnboardingFunnel()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/analytics/onboarding/track", requireAuth, async (req, res): Promise<void> => {
  const { step, metadata } = req.body;
  try { res.json(trackOnboardingEvent((req as any).auth?.userId || "", step, metadata)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
