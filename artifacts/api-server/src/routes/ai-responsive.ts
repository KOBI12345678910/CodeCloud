import { Router, Request, Response } from "express";
import { aiResponsiveService } from "../services/ai-responsive";

const router = Router();

router.post("/responsive/analyze", (req: Request, res: Response): void => {
  const { url, viewports } = req.body;
  if (!url) { res.status(400).json({ error: "url required" }); return; }
  res.json(aiResponsiveService.analyze(url, viewports));
});

router.get("/responsive/viewports", (_req: Request, res: Response): void => {
  res.json({ viewports: aiResponsiveService.getDefaultViewports() });
});

export default router;
