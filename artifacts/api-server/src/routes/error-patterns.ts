import { Router, Request, Response } from "express";
import { errorPatternService } from "../services/error-patterns";

const router = Router();

router.get("/error-patterns", (_req: Request, res: Response): void => {
  const patterns = errorPatternService.getPatterns();
  res.json({ patterns });
});

router.get("/error-patterns/stats", (_req: Request, res: Response): void => {
  const stats = errorPatternService.getStats();
  res.json(stats);
});

router.get("/error-patterns/:id", (req: Request, res: Response): void => {
  const pattern = errorPatternService.getPatternById(req.params.id as string);
  if (!pattern) {
    res.status(404).json({ error: "Pattern not found" });
    return;
  }
  res.json(pattern);
});

router.get("/error-patterns/:id/occurrences", (req: Request, res: Response): void => {
  const limit = parseInt((req.query.limit as string) || "50", 10);
  const occurrences = errorPatternService.getOccurrences(req.params.id as string, undefined, limit);
  res.json({ occurrences });
});

router.get("/error-patterns/:id/analysis", (req: Request, res: Response): void => {
  const analysis = errorPatternService.analyzeCause(req.params.id as string);
  if (!analysis) {
    res.status(404).json({ error: "Pattern not found" });
    return;
  }
  res.json(analysis);
});

router.post("/error-patterns/match", (req: Request, res: Response): void => {
  const { message, containerId, containerName, stackTrace, context } = req.body;
  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  const matched = errorPatternService.matchMessage(message);
  if (!matched) {
    res.json({ matched: false, pattern: null });
    return;
  }
  const occurrence = errorPatternService.recordOccurrence(
    matched.id,
    containerId || "unknown",
    containerName || "unknown",
    message,
    stackTrace || null,
    context || {}
  );
  res.json({ matched: true, pattern: matched, occurrence });
});

router.post("/error-patterns", (req: Request, res: Response): void => {
  const { id, pattern: patternStr, category, severity, description, suggestedFix, autoRemediation, remediationAction } = req.body;
  if (!id || !patternStr || !category || !severity || !description) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  try {
    const p = errorPatternService.addPattern({
      id,
      pattern: patternStr,
      regex: new RegExp(patternStr, "i"),
      category,
      severity,
      description,
      suggestedFix: suggestedFix || "",
      autoRemediation: autoRemediation || false,
      remediationAction: remediationAction || null,
    });
    res.status(201).json(p);
  } catch {
    res.status(400).json({ error: "Invalid pattern regex" });
  }
});

router.delete("/error-patterns/:id", (req: Request, res: Response): void => {
  const removed = errorPatternService.removePattern(req.params.id as string);
  if (!removed) {
    res.status(404).json({ error: "Pattern not found" });
    return;
  }
  res.json({ success: true });
});

router.post("/error-patterns/occurrences/:id/resolve", (req: Request, res: Response): void => {
  const resolved = errorPatternService.resolveOccurrence(req.params.id as string);
  if (!resolved) {
    res.status(404).json({ error: "Occurrence not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
