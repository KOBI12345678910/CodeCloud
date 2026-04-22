import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/project-milestones/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ milestones: [] }); });
r.post("/project-milestones/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ id: `ms_${Date.now()}`, created: true }); });
r.put("/project-milestones/:projectId/:milestoneId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ updated: true }); });
r.delete("/project-milestones/:projectId/:milestoneId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ deleted: true }); });
export default r;
