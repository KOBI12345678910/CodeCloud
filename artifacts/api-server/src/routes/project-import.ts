import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.post("/project-import/github", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ importId: `imp_${Date.now()}`, status: "importing" }); });
r.post("/project-import/gitlab", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ importId: `imp_${Date.now()}`, status: "importing" }); });
r.post("/project-import/zip", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ importId: `imp_${Date.now()}`, status: "processing" }); });
r.get("/project-import/status/:importId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ status: "completed", projectId: "proj_123" }); });
export default r;
