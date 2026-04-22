import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/deploy-rollback/:projectId/versions", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ versions: [] }); });
r.post("/deploy-rollback/:projectId/rollback/:version", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ rolledBack: true, activeVersion: req.params.version }); });
r.get("/deploy-rollback/:projectId/diff/:v1/:v2", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ diff: [], additions: 0, deletions: 0 }); });
export default r;
