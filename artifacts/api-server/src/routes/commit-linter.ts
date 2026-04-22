import { Router, Request, Response } from "express";
import { commitLinterService } from "../services/commit-linter";

const router = Router();

router.post("/commit-lint", (req: Request, res: Response): void => {
  const { message } = req.body;
  if (!message) { res.status(400).json({ error: "message required" }); return; }
  res.json(commitLinterService.lint(message));
});

router.get("/commit-lint/rules", (_req: Request, res: Response): void => {
  res.json({ rules: commitLinterService.getRules().map(r => ({ ...r, pattern: r.pattern.source })) });
});

router.put("/commit-lint/rules/:id", (req: Request, res: Response): void => {
  const { enabled } = req.body;
  if (!commitLinterService.toggleRule(req.params.id as string, enabled)) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json({ success: true });
});

router.post("/commit-lint/rules", (req: Request, res: Response): void => {
  const { name, pattern, message, severity, enabled } = req.body;
  if (!name || !pattern || !message) { res.status(400).json({ error: "name, pattern, message required" }); return; }
  try {
    const rule = commitLinterService.addRule({ name, pattern: new RegExp(pattern), message, severity: severity || "warning", enabled: enabled ?? true });
    res.status(201).json({ ...rule, pattern: rule.pattern.source });
  } catch { res.status(400).json({ error: "Invalid regex pattern" }); }
});

export default router;
