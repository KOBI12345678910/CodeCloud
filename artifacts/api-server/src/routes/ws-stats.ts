import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { wsManager } from "../websocket";

const router: IRouter = Router();

router.get("/ws/stats", requireAuth, async (_req, res): Promise<void> => {
  const stats = wsManager.getStats();
  res.json(stats);
});

export default router;
