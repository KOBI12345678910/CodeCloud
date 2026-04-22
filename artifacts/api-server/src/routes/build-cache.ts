import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/build-cache/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ cacheSize: "45MB", entries: 12, hitRate: 0.87 }); });
r.delete("/build-cache/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ cleared: true }); });
r.post("/build-cache/:projectId/warm", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ warming: true }); });
export default r;
