import { Router, Request, Response } from "express";
import { aiComponentLibService } from "../services/ai-component-lib";

const router = Router();

router.post("/ai/component-lib/analyze", (req: Request, res: Response): void => {
  const { projectId, files } = req.body;
  if (!projectId || !files) { res.status(400).json({ error: "projectId and files required" }); return; }
  res.json(aiComponentLibService.analyze(projectId, files));
});

router.get("/ai/component-lib", (req: Request, res: Response): void => {
  res.json({ libraries: aiComponentLibService.list(req.query.projectId as string) });
});

export default router;
