import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import * as alwaysOnService from "../services/always-on";

const router: IRouter = Router();

router.post("/projects/:projectId/always-on/enable", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  const config = alwaysOnService.enable(projectId, {
    healthUrl: req.body.healthUrl,
    bootCommand: req.body.bootCommand,
    restartPolicy: req.body.restartPolicy,
  });
  res.json({ config });
});

router.post("/projects/:projectId/always-on/disable", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  alwaysOnService.disable(projectId);
  res.json({ message: "Always-On disabled" });
});

router.get("/projects/:projectId/always-on", async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  const config = alwaysOnService.getConfig(projectId);
  res.json({ config });
});

router.put("/projects/:projectId/always-on", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  const config = alwaysOnService.updateConfig(projectId, {
    healthUrl: req.body.healthUrl,
    bootCommand: req.body.bootCommand,
    restartPolicy: req.body.restartPolicy,
    maxRestarts: req.body.maxRestarts,
  });
  res.json({ config });
});

router.post("/projects/:projectId/always-on/reset-restarts", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  alwaysOnService.resetRestarts(projectId);
  res.json({ message: "Restart counter reset" });
});

export default router;
