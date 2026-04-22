import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { detectSchemaChanges, generateMigration, applyMigration, rollbackMigration, getMigrationHistory } from "../services/auto-migrate";

const router: IRouter = Router();

router.get("/projects/:id/migrations", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getMigrationHistory(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/migrations/detect", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(detectSchemaChanges(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/migrations/generate", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { changes } = req.body;
  try { res.status(201).json(generateMigration(projectId, changes || detectSchemaChanges(projectId))); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/migrations/:migrationId/apply", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const migrationId = Array.isArray(req.params.migrationId) ? req.params.migrationId[0] : req.params.migrationId;
  try { res.json(applyMigration(migrationId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/migrations/:migrationId/rollback", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const migrationId = Array.isArray(req.params.migrationId) ? req.params.migrationId[0] : req.params.migrationId;
  try { res.json(rollbackMigration(migrationId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
