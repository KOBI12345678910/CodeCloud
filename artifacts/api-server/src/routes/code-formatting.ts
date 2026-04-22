import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.post("/code-formatting/format", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ formatted: req.body?.code || "", changes: 0 }); });
r.get("/code-formatting/config/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ formatter: "prettier", config: { tabWidth: 2, singleQuote: true, semi: true } }); });
r.put("/code-formatting/config/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ updated: true }); });
export default r;
