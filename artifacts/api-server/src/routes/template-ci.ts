import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { runTemplateCITests } from "../jobs/template-ci";

const router: IRouter = Router();

router.post("/admin/template-ci/run", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(runTemplateCITests()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
