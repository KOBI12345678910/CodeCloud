import { Router, Request, Response } from "express";
import { clientGenService } from "../services/client-gen";

const router = Router();

router.post("/client-gen", (req: Request, res: Response): void => {
  const { projectId, language, specUrl } = req.body;
  if (!projectId || !language || !specUrl) { res.status(400).json({ error: "projectId, language, specUrl required" }); return; }
  res.status(201).json(clientGenService.generate(projectId, language, specUrl));
});

router.get("/client-gen", (req: Request, res: Response): void => {
  res.json({ clients: clientGenService.list(req.query.projectId as string) });
});

router.get("/client-gen/:id", (req: Request, res: Response): void => {
  const c = clientGenService.get(req.params.id as string);
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  res.json(c);
});

export default router;
