import { Router, Request, Response } from "express";
import { templateWizardService } from "../services/template-wizard";
const router = Router();
router.get("/template-wizard", (_req: Request, res: Response): void => { res.json(templateWizardService.listWizards()); });
router.get("/template-wizard/:templateId", (req: Request, res: Response): void => { const w = templateWizardService.getWizard(req.params.templateId as string); w ? res.json(w) : res.status(404).json({ error: "Not found" }); });
router.post("/template-wizard", (req: Request, res: Response): void => { res.status(201).json(templateWizardService.createWizard(req.body.templateId, req.body.steps || [])); });
router.post("/template-wizard/:templateId/execute", (req: Request, res: Response): void => { res.json(templateWizardService.execute(req.params.templateId as string, req.body.answers || {})); });
export default router;
