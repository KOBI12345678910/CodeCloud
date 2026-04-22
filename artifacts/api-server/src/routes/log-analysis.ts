import { Router, Request, Response } from "express";
import { logAnalysisService } from "../services/log-analysis";
const router = Router();
router.post("/log-analysis/ingest", (req: Request, res: Response): void => { res.json({ ingested: logAnalysisService.ingest(req.body.entries || []) }); });
router.get("/log-analysis", (req: Request, res: Response): void => { res.json(logAnalysisService.analyze(Number(req.query.minutes) || 60)); });
router.post("/log-analysis/search", (req: Request, res: Response): void => { res.json(logAnalysisService.search(req.body.query || "", req.body.level, req.body.limit)); });
router.post("/log-analysis/clear", (_req: Request, res: Response): void => { res.json({ cleared: logAnalysisService.clear() }); });
export default router;
