import { Router, Request, Response } from "express";
import { diffChangelogService } from "../services/diff-changelog";

const router = Router();

router.post("/changelog/generate", (req: Request, res: Response): void => {
  const { version, diff } = req.body;
  if (!version || !diff) { res.status(400).json({ error: "version and diff required" }); return; }
  res.status(201).json(diffChangelogService.generate(version, diff));
});

router.get("/changelog", (_req: Request, res: Response): void => {
  res.json({ entries: diffChangelogService.list() });
});

router.get("/changelog/:id", (req: Request, res: Response): void => {
  const entry = diffChangelogService.get(req.params.id as string);
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  res.json(entry);
});

router.get("/changelog/:id/render", (req: Request, res: Response): void => {
  const entry = diffChangelogService.get(req.params.id as string);
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  res.type("text/markdown").send(diffChangelogService.render(entry));
});

export default router;
