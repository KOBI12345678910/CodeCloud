import { Router, Request, Response } from "express";
import { hackathonsService } from "../services/hackathons";
const router = Router();
router.get("/hackathons", (_req: Request, res: Response): void => { res.json(hackathonsService.list()); });
router.post("/hackathons", (req: Request, res: Response): void => { res.status(201).json(hackathonsService.create(req.body)); });
router.get("/hackathons/:id", (req: Request, res: Response): void => { const h = hackathonsService.get(req.params.id as string); h ? res.json(h) : res.status(404).json({ error: "Not found" }); });
router.post("/hackathons/:id/join", (req: Request, res: Response): void => { const h = hackathonsService.join(req.params.id as string, req.body.userId); h ? res.json(h) : res.status(404).json({ error: "Not found" }); });
router.post("/hackathons/:id/submit", (req: Request, res: Response): void => { const h = hackathonsService.submitProject(req.params.id as string, req.body.userId, req.body.projectId); h ? res.json(h) : res.status(404).json({ error: "Not found" }); });
export default router;
