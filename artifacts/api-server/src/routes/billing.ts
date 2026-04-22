import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { meteredBillingService } from "../services/billing-metered";

const router: IRouter = Router();

router.get("/billing/pricing", async (_req, res): Promise<void> => {
  res.json(meteredBillingService.getPricingData());
});

router.get("/billing/summary", requireAuth, async (req, res): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const summary = await meteredBillingService.getBillingSummary(userId);
    res.json(summary);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
