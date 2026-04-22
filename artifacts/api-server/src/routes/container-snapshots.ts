import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/container-snapshots/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ snapshots: [] }); });
r.post("/container-snapshots/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ snapshotId: `snap_${Date.now()}`, status: "creating" }); });
r.post("/container-snapshots/restore/:snapshotId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ restored: true }); });
r.delete("/container-snapshots/:snapshotId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ deleted: true }); });
export default r;
