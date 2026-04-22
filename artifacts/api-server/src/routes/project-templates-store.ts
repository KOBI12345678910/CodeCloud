import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/template-store", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ templates: [], categories: ["web", "api", "mobile", "game", "ai"] }); });
r.get("/template-store/:templateId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ id: req.params.templateId, name: "", description: "", uses: 0 }); });
r.post("/template-store", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ id: `tmpl_${Date.now()}`, published: true }); });
r.post("/template-store/:templateId/use", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ projectId: `proj_${Date.now()}` }); });
export default r;
