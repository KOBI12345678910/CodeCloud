import { Router, Request, Response } from "express";
import { mutationTestingService } from "../services/mutation-testing";

const router = Router();

router.post("/mutation-testing/run", (req: Request, res: Response): void => {
  const { projectId, files } = req.body;
  if (!projectId || !files) { res.status(400).json({ error: "projectId and files required" }); return; }
  res.status(201).json(mutationTestingService.run(projectId, files));
});

router.get("/mutation-testing", (req: Request, res: Response): void => {
  res.json({ runs: mutationTestingService.list(req.query.projectId as string) });
});

router.get("/mutation-testing/:id", (req: Request, res: Response): void => {
  const run = mutationTestingService.get(req.params.id as string);
  if (!run) { res.status(404).json({ error: "Not found" }); return; }
  res.json(run);
});

export default router;
