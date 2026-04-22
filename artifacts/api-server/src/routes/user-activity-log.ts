import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/user-activity-log", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ activities: [], cursor: null }); });
r.get("/user-activity-log/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ activities: [] }); });
export default r;
