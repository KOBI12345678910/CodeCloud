import { Router, Request, Response } from "express";
import { aiReadmeService } from "../services/ai-readme";

const router = Router();

router.post("/ai/readme", (req: Request, res: Response): void => {
  const { projectId, projectName, files } = req.body;
  if (!projectId || !projectName) { res.status(400).json({ error: "projectId and projectName required" }); return; }
  res.status(201).json(aiReadmeService.generate(projectId, projectName, files || []));
});

router.get("/ai/readme", (req: Request, res: Response): void => {
  res.json({ readmes: aiReadmeService.list(req.query.projectId as string) });
});

export default router;
