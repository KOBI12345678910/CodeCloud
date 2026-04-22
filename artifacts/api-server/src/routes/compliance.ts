import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { generateComplianceReport } from "../services/compliance-report";

const router: IRouter = Router();

router.get("/projects/:id/compliance/:framework", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const framework = (Array.isArray(req.params.framework) ? req.params.framework[0] : req.params.framework) as "SOC2" | "GDPR" | "HIPAA";
  try { res.json(generateComplianceReport(projectId, framework)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
