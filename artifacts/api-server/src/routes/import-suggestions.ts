import { Router, Request, Response } from "express";
import { importSuggestionsService } from "../services/import-suggestions";
const router = Router();
router.get("/import-suggestions/:symbol", (req: Request, res: Response): void => { res.json(importSuggestionsService.suggest(req.params.symbol as string)); });
router.post("/import-suggestions/scan", (req: Request, res: Response): void => { res.json(importSuggestionsService.scanFile(req.body.content || "")); });
router.post("/import-suggestions/register", (req: Request, res: Response): void => { const { symbol, module: mod, isDefault } = req.body; importSuggestionsService.register(symbol, mod, isDefault); res.json({ success: true }); });
export default router;
