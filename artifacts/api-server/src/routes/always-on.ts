import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { alwaysOnService } from "../services/always-on";

const router: IRouter = Router();

router.post("/projects/:projectId/always-on/enable", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  const userId = (req as any).auth?.userId || (req as any).user?.id;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const config = await alwaysOnService.enable(userId, projectId, {
      healthUrl: req.body?.healthUrl,
      bootCommand: req.body?.bootCommand,
      restartPolicy: req.body?.restartPolicy,
    });
    res.json({ config });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Failed to enable Always-On" });
  }
});

router.post("/projects/:projectId/always-on/disable", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  await alwaysOnService.disable(projectId);
  res.json({ message: "Always-On disabled" });
});

router.get("/projects/:projectId/always-on", async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  try {
    const config = await alwaysOnService.getConfig(projectId);
    res.json({ config });
  } catch (err: any) {
    res.status(404).json({ error: err?.message || "Project not found" });
  }
});

router.put("/projects/:projectId/always-on", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  const config = await alwaysOnService.updateConfig(projectId, {
    healthUrl: req.body?.healthUrl,
    bootCommand: req.body?.bootCommand,
    restartPolicy: req.body?.restartPolicy,
    maxRestarts: req.body?.maxRestarts,
  });
  res.json({ config });
});

router.post("/projects/:projectId/always-on/reset-restarts", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  await alwaysOnService.resetRestarts(projectId);
  res.json({ message: "Restart counter reset" });
});

export default router;
