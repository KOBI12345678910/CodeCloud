import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getTemplateAnalytics, getTemplateAbTests } from "../services/template-analytics";

const router: IRouter = Router();

router.get("/templates/analytics", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(getTemplateAnalytics()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/templates/ab-tests", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(getTemplateAbTests()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
