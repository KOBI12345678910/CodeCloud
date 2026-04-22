import { Router, Request, Response } from "express";
import { badgeGeneratorService } from "../services/badge-generator";
const router = Router();
router.post("/badge-generator", (req: Request, res: Response): void => { res.json(badgeGeneratorService.generateBadge(req.body.label, req.body.value, req.body.color, req.body.style)); });
router.post("/badge-generator/project", (req: Request, res: Response): void => { const badges = badgeGeneratorService.generateProjectBadges(req.body); res.json({ badges, markdown: badgeGeneratorService.getMarkdown(badges) }); });
export default router;
