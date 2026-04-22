import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { triggerBackup, triggerRestore, listSyncLogs, getTransactionLogs } from "../services/db-sync";

const router: IRouter = Router();

router.post("/projects/:id/db-sync/backup", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = (req as AuthenticatedRequest).userId;
  try { res.json(await triggerBackup(projectId, userId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/db-sync/restore", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = (req as AuthenticatedRequest).userId;
  const { restorePoint } = req.body;
  if (!restorePoint) { res.status(400).json({ error: "restorePoint is required" }); return; }
  try { res.json(await triggerRestore(projectId, userId, new Date(restorePoint))); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/db-sync/logs", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(await listSyncLogs(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/db-sync/transactions", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(await getTransactionLogs(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
