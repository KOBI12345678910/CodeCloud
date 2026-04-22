import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/custom-runners", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ runners: [{ id: "node18", name: "Node.js 18", language: "javascript" }, { id: "python3", name: "Python 3.11", language: "python" }] }); });
r.post("/custom-runners", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ id: `runner_${Date.now()}`, created: true }); });
r.put("/custom-runners/:runnerId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ updated: true }); });
r.delete("/custom-runners/:runnerId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ deleted: true }); });
export default r;
