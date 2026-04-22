import { Router, Request, Response } from "express";
import { apiKeysService } from "../services/api-keys";
const router = Router();
router.get("/api-keys/user/:userId", (req: Request, res: Response): void => { res.json(apiKeysService.listByUser(req.params.userId as string)); });
router.post("/api-keys", (req: Request, res: Response): void => { res.status(201).json(apiKeysService.create(req.body)); });
router.get("/api-keys/:id", (req: Request, res: Response): void => { const k = apiKeysService.get(req.params.id as string); k ? res.json(k) : res.status(404).json({ error: "Not found" }); });
router.post("/api-keys/:id/revoke", (req: Request, res: Response): void => { apiKeysService.revoke(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
router.delete("/api-keys/:id", (req: Request, res: Response): void => { apiKeysService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
