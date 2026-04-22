import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.post("/live-share/sessions", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ sessionId: `ls_${Date.now()}`, joinUrl: `https://codecloud.dev/live/${Date.now()}`, expiresAt: new Date(Date.now() + 3600000).toISOString() }); });
r.get("/live-share/sessions/:sessionId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ sessionId: req.params.sessionId, participants: [], status: "active" }); });
r.post("/live-share/sessions/:sessionId/join", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ joined: true }); });
r.delete("/live-share/sessions/:sessionId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ ended: true }); });
export default r;
