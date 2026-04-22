import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { verifyBackup, getComplianceReport } from "../services/backup-verify";

const router: IRouter = Router();

router.post("/projects/:id/backups/:backupId/verify", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const backupId = Array.isArray(req.params.backupId) ? req.params.backupId[0] : req.params.backupId;
  try { res.json(verifyBackup(projectId, backupId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/backups/compliance", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getComplianceReport(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
