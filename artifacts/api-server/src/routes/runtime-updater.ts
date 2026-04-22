import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { runtimeUpdaterService } from "../services/runtime-updater";

const router: IRouter = Router();

router.get("/projects/:projectId/runtimes", requireAuth, async (req, res): Promise<void> => {
  const runtimes = await runtimeUpdaterService.listRuntimes(req.params.projectId as string);
  res.json(runtimes);
});

router.get("/projects/:projectId/runtimes/:id", requireAuth, async (req, res): Promise<void> => {
  const rt = await runtimeUpdaterService.getRuntime(req.params.id as string);
  if (!rt) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rt);
});

router.put("/projects/:projectId/runtimes/:id/policy", requireAuth, async (req, res): Promise<void> => {
  const rt = await runtimeUpdaterService.updatePolicy(req.params.id as string, req.body);
  if (!rt) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rt);
});

router.post("/projects/:projectId/runtimes/:id/update", requireAuth, async (req, res): Promise<void> => {
  const update = await runtimeUpdaterService.initiateUpdate(req.params.id as string, req.body.targetVersion);
  if (!update) { res.status(404).json({ error: "Not found" }); return; }
  res.json(update);
});

router.post("/projects/:projectId/runtimes/:id/rollback/:updateId", requireAuth, async (req, res): Promise<void> => {
  const update = await runtimeUpdaterService.rollback(req.params.id as string, req.params.updateId as string, req.body.reason || "Manual rollback");
  if (!update) { res.status(404).json({ error: "Not found" }); return; }
  res.json(update);
});

router.post("/projects/:projectId/runtimes/:id/compatibility", requireAuth, async (req, res): Promise<void> => {
  const result = await runtimeUpdaterService.checkCompatibility(req.params.id as string, req.body.targetVersion);
  res.json(result);
});

export default router;
