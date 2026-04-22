import { Router, Request, Response } from "express";
import { keyboardShortcutsService } from "../services/keyboard-shortcuts";
const router = Router();
router.get("/keyboard-shortcuts", (req: Request, res: Response): void => { res.json(keyboardShortcutsService.list(req.query.category as string)); });
router.get("/keyboard-shortcuts/categories", (_req: Request, res: Response): void => { res.json(keyboardShortcutsService.getCategories()); });
router.get("/keyboard-shortcuts/:id", (req: Request, res: Response): void => { const s = keyboardShortcutsService.get(req.params.id as string); s ? res.json(s) : res.status(404).json({ error: "Not found" }); });
router.put("/keyboard-shortcuts/:id", (req: Request, res: Response): void => { const s = keyboardShortcutsService.update(req.params.id as string, req.body); s ? res.json(s) : res.status(404).json({ error: "Not found or not customizable" }); });
router.post("/keyboard-shortcuts/reset", (_req: Request, res: Response): void => { keyboardShortcutsService.resetAll(); res.json({ success: true }); });
export default router;
