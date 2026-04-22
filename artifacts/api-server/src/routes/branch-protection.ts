import { Router, Request, Response } from "express";
import { branchProtectionService } from "../services/branch-protection";

const router = Router();

router.get("/branch-protection", (_req: Request, res: Response): void => {
  res.json(branchProtectionService.listRules());
});

router.get("/branch-protection/:id", (req: Request, res: Response): void => {
  const rule = branchProtectionService.getRule(req.params.id as string);
  if (!rule) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json(rule);
});

router.post("/branch-protection", (req: Request, res: Response): void => {
  const { pattern, requireReviews = true, requiredReviewers = 1, requirePassingTests = true, requiredChecks = [], blockForcePush = true, requireSignedCommits = false, enforceNamingConvention = false, namingPattern = null, allowDeletions = false, allowAdminBypass = false, enabled = true } = req.body;
  if (!pattern) { res.status(400).json({ error: "pattern required" }); return; }
  res.status(201).json(branchProtectionService.createRule({ pattern, requireReviews, requiredReviewers, requirePassingTests, requiredChecks, blockForcePush, requireSignedCommits, enforceNamingConvention, namingPattern, allowDeletions, allowAdminBypass, enabled }));
});

router.put("/branch-protection/:id", (req: Request, res: Response): void => {
  const rule = branchProtectionService.updateRule(req.params.id as string, req.body);
  if (!rule) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json(rule);
});

router.delete("/branch-protection/:id", (req: Request, res: Response): void => {
  if (!branchProtectionService.deleteRule(req.params.id as string)) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json({ success: true });
});

router.post("/branch-protection/check-push", (req: Request, res: Response): void => {
  const { branch, forcePush, signed, testsPass, reviewCount, checks } = req.body;
  if (!branch) { res.status(400).json({ error: "branch required" }); return; }
  res.json(branchProtectionService.checkPush(branch, { forcePush, signed, testsPass, reviewCount, checks }));
});

router.post("/branch-protection/check-name", (req: Request, res: Response): void => {
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  res.json(branchProtectionService.checkBranchName(name));
});

export default router;
