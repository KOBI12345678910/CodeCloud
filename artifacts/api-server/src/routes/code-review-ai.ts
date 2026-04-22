import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.post("/code-review-ai/review", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ reviewId: `rev_${Date.now()}`, comments: [], score: 85, summary: "Code looks good" }); });
r.get("/code-review-ai/reviews/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ reviews: [] }); });
r.post("/code-review-ai/suggest/:reviewId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ suggestions: [] }); });
export default r;
