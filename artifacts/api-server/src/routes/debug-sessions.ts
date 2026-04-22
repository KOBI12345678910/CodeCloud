import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.post("/debug-sessions/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ sessionId: `dbg_${Date.now()}`, port: 9229, status: "attached" }); });
r.get("/debug-sessions/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ sessions: [] }); });
r.post("/debug-sessions/:sessionId/breakpoint", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ set: true }); });
r.delete("/debug-sessions/:sessionId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ terminated: true }); });
export default r;
