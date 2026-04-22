import { Router, Request, Response } from "express";
import { starterKitsService } from "../services/starter-kits";
const router = Router();
router.get("/starter-kits", (req: Request, res: Response): void => { res.json(starterKitsService.list(req.query.category as string)); });
router.get("/starter-kits/search", (req: Request, res: Response): void => { res.json(starterKitsService.search(req.query.q as string || "")); });
router.get("/starter-kits/:id", (req: Request, res: Response): void => { const k = starterKitsService.get(req.params.id as string); k ? res.json(k) : res.status(404).json({ error: "Not found" }); });
router.post("/starter-kits", (req: Request, res: Response): void => { res.status(201).json(starterKitsService.create(req.body)); });
router.delete("/starter-kits/:id", (req: Request, res: Response): void => { starterKitsService.delete(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
