import { Router, Request, Response } from "express";
import { aiComponentGenService } from "../services/ai-component-gen";

const router = Router();

router.post("/ai/component-gen", (req: Request, res: Response): void => {
  const { description, name } = req.body;
  if (!description) { res.status(400).json({ error: "description required" }); return; }
  res.status(201).json(aiComponentGenService.generate(description, name));
});

router.get("/ai/component-gen", (_req: Request, res: Response): void => {
  res.json({ components: aiComponentGenService.list() });
});

export default router;
