import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/project-badges/:projectId", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ badges: [{ type: "build", status: "passing" }, { type: "coverage", value: "85%" }] }); });
r.get("/project-badges/:projectId/:badgeType.svg", requireAuth, async (req: Request, res: Response): Promise<void> => { res.setHeader("Content-Type", "image/svg+xml"); res.send('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20"><text x="10" y="15">passing</text></svg>'); });
export default r;
