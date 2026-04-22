import { Router, Request, Response } from "express";
import { sessionManagerService } from "../services/session-manager";
const router = Router();
router.get("/session-manager/:userId", (req: Request, res: Response): void => { res.json(sessionManagerService.listByUser(req.params.userId as string)); });
router.post("/session-manager", (req: Request, res: Response): void => { res.status(201).json(sessionManagerService.create(req.body)); });
router.post("/session-manager/:id/revoke", (req: Request, res: Response): void => { sessionManagerService.revoke(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
router.post("/session-manager/:userId/revoke-all", (req: Request, res: Response): void => { res.json({ revoked: sessionManagerService.revokeAll(req.params.userId as string, req.query.except as string) }); });
router.post("/session-manager/:id/touch", (req: Request, res: Response): void => { sessionManagerService.touch(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
