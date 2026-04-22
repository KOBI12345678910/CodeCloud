import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/project-forks/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ forks: [], total: 0 }); });
r.post("/project-forks/:projectId/fork", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ forkedProjectId: `proj_${Date.now()}`, status: "forking" }); });
r.post("/project-forks/:projectId/sync-upstream", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ synced: true, conflicts: [] }); });
export default r;
