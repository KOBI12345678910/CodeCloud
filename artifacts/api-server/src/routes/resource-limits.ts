import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/resource-limits/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ cpu: { limit: "2 vCPU", used: "0.5 vCPU" }, memory: { limit: "4GB", used: "1.2GB" }, storage: { limit: "10GB", used: "2.3GB" }, bandwidth: { limit: "100GB", used: "5GB" } }); });
r.put("/resource-limits/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ updated: true }); });
export default r;
