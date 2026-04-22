import { Router, Request, Response } from "express";
import { licenseComplianceService } from "../services/license-compliance";

const router = Router();

router.post("/license-compliance/check", (req: Request, res: Response): void => {
  const { projectId, dependencies, isCommercial } = req.body;
  if (!projectId || !dependencies) { res.status(400).json({ error: "projectId and dependencies required" }); return; }
  res.json(licenseComplianceService.check(projectId, dependencies, isCommercial !== false));
});

router.get("/license-compliance", (req: Request, res: Response): void => {
  res.json({ checks: licenseComplianceService.list(req.query.projectId as string) });
});

router.get("/license-compliance/matrix", (_req: Request, res: Response): void => {
  res.json({ matrix: licenseComplianceService.getMatrix() });
});

export default router;
