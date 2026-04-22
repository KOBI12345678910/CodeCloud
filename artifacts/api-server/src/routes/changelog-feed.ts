import { Router, Request, Response } from "express";
import { changelogFeedService } from "../services/changelog-feed";
const router = Router();
router.get("/changelog-feed/:projectId", (req: Request, res: Response): void => { res.json(changelogFeedService.list(req.params.projectId as string)); });
router.post("/changelog-feed", (req: Request, res: Response): void => { res.status(201).json(changelogFeedService.add(req.body)); });
router.get("/changelog-feed/:projectId/rss", (req: Request, res: Response): void => { res.type("application/rss+xml").send(changelogFeedService.toRSS(req.params.projectId as string, req.query.baseUrl as string || "https://codecloud.app")); });
router.get("/changelog-feed/:projectId/atom", (req: Request, res: Response): void => { res.type("application/atom+xml").send(changelogFeedService.toAtom(req.params.projectId as string, req.query.baseUrl as string || "https://codecloud.app")); });
router.delete("/changelog-feed/:id", (req: Request, res: Response): void => { changelogFeedService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
