import { Router, Request, Response } from "express";
import { changelogPageService } from "../services/changelog-page";
const router = Router();
router.get("/changelog-page", (req: Request, res: Response): void => { res.json(changelogPageService.list(req.query.type as any)); });
router.post("/changelog-page", (req: Request, res: Response): void => { res.status(201).json(changelogPageService.add(req.body)); });
router.get("/changelog-page/:id", (req: Request, res: Response): void => { const c = changelogPageService.get(req.params.id as string); c ? res.json(c) : res.status(404).json({ error: "Not found" }); });
router.put("/changelog-page/:id", (req: Request, res: Response): void => { const c = changelogPageService.update(req.params.id as string, req.body); c ? res.json(c) : res.status(404).json({ error: "Not found" }); });
router.delete("/changelog-page/:id", (req: Request, res: Response): void => { changelogPageService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
