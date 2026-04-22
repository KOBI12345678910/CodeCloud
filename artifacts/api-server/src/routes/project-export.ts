import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.post("/project-export/:projectId/zip", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ exportId: `exp_${Date.now()}`, status: "generating" }); });
r.post("/project-export/:projectId/github", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ pushed: true, repoUrl: "" }); });
r.get("/project-export/status/:exportId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ status: "ready", downloadUrl: "" }); });
export default r;
