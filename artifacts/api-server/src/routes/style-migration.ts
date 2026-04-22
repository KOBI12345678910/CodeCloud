import { Router, Request, Response } from "express";
import { styleMigrationService } from "../services/style-migration";

const router = Router();

router.get("/style-migration/rules", (_req: Request, res: Response): void => {
  res.json({ rules: styleMigrationService.getAvailableRules() });
});

router.post("/style-migration/preview", (req: Request, res: Response): void => {
  const { content, ruleIds } = req.body;
  if (!content || !ruleIds) { res.status(400).json({ error: "content and ruleIds required" }); return; }
  res.json(styleMigrationService.preview(content, ruleIds));
});

router.post("/style-migration/migrate", (req: Request, res: Response): void => {
  const { files, ruleIds } = req.body;
  if (!files || !ruleIds) { res.status(400).json({ error: "files and ruleIds required" }); return; }
  res.json(styleMigrationService.migrate(files, ruleIds));
});

router.get("/style-migration/history", (_req: Request, res: Response): void => {
  res.json({ history: styleMigrationService.getHistory() });
});

router.post("/style-migration/:id/revert", (req: Request, res: Response): void => {
  if (!styleMigrationService.revert(req.params.id as string)) { res.status(404).json({ error: "Migration not found or already reverted" }); return; }
  res.json({ success: true });
});

export default router;
