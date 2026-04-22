import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/container-logs/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ logs: [], cursor: null }); });
r.get("/container-logs/:projectId/stream", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ streamUrl: "" }); });
r.delete("/container-logs/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ cleared: true }); });
export default r;
