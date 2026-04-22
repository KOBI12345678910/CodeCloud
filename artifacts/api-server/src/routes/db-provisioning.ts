import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { dbProvisioningService } from "../services/db-provisioning";

const router: IRouter = Router();

router.get("/projects/:projectId/databases", requireAuth, async (req, res): Promise<void> => {
  const dbs = await dbProvisioningService.listDatabases(req.params.projectId as string);
  res.json(dbs);
});

router.get("/projects/:projectId/databases/:id", requireAuth, async (req, res): Promise<void> => {
  const db = await dbProvisioningService.getDatabase(req.params.id as string);
  if (!db) { res.status(404).json({ error: "Not found" }); return; }
  res.json(db);
});

router.post("/projects/:projectId/databases", requireAuth, async (req, res): Promise<void> => {
  const db = await dbProvisioningService.provision(req.params.projectId as string, req.body);
  res.json(db);
});

router.delete("/projects/:projectId/databases/:id", requireAuth, async (req, res): Promise<void> => {
  const ok = await dbProvisioningService.deprovision(req.params.id as string);
  if (!ok) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

router.get("/projects/:projectId/databases/:id/connection", requireAuth, async (req, res): Promise<void> => {
  const conn = await dbProvisioningService.getConnectionString(req.params.id as string);
  if (!conn) { res.status(404).json({ error: "Not found" }); return; }
  res.json(conn);
});

router.post("/projects/:projectId/databases/:id/backups", requireAuth, async (req, res): Promise<void> => {
  const backup = await dbProvisioningService.createBackup(req.params.id as string, req.body.type || "manual");
  if (!backup) { res.status(404).json({ error: "Database not found" }); return; }
  res.json(backup);
});

router.post("/projects/:projectId/databases/:id/migrations", requireAuth, async (req, res): Promise<void> => {
  const migration = await dbProvisioningService.runMigration(
    req.params.id as string, req.body.version, req.body.name, req.body.direction || "up"
  );
  if (!migration) { res.status(404).json({ error: "Database not found" }); return; }
  res.json(migration);
});

export default router;
