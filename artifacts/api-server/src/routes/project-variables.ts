import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/project-variables/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ variables: [] }); });
r.post("/project-variables/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ id: `var_${Date.now()}`, created: true }); });
r.put("/project-variables/:projectId/:varId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ updated: true }); });
r.delete("/project-variables/:projectId/:varId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ deleted: true }); });
export default r;
