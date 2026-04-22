import { Router, Request, Response } from "express";
import { searchIndexService } from "../services/search-index";
const router = Router();
router.get("/search-index", (req: Request, res: Response): void => { res.json(searchIndexService.search(req.query.q as string || "", req.query.type as any, Number(req.query.limit) || 20)); });
router.post("/search-index", (req: Request, res: Response): void => { searchIndexService.index(req.body.id, req.body); res.json({ success: true }); });
router.delete("/search-index/:id", (req: Request, res: Response): void => { searchIndexService.remove(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
router.get("/search-index/count", (_req: Request, res: Response): void => { res.json({ count: searchIndexService.getCount() }); });
export default router;
