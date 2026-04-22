import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { detectDuplicates } from "../services/duplication-detector";

const router: IRouter = Router();

router.get("/duplication/report", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(detectDuplicates()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
