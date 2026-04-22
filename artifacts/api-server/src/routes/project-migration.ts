import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { createMigrationPlan, executeMigration, exportProjectConfig } from "../services/project-migration";

const router: IRouter = Router();

router.post("/projects/:id/migrate/plan", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { toPlan, toOrg } = req.body;
  try { res.json(await createMigrationPlan(projectId, { toPlan, toOrg })); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/migrate/execute", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { toPlan, toOrg } = req.body;
  try {
    const plan = await createMigrationPlan(projectId, { toPlan, toOrg });
    const result = await executeMigration(plan);
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/migrate/export", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(await exportProjectConfig(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
