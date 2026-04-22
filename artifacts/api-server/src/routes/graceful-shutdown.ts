import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { gracefulShutdownService } from "../services/graceful-shutdown";

const router: IRouter = Router();

router.get("/projects/:projectId/containers/:containerId/shutdown/config", requireAuth, async (req, res): Promise<void> => {
  const config = gracefulShutdownService.getConfig(req.params.containerId as string);
  res.json(config);
});

router.put("/projects/:projectId/containers/:containerId/shutdown/config", requireAuth, async (req, res): Promise<void> => {
  const config = gracefulShutdownService.setConfig(req.params.containerId as string, req.body);
  res.json(config);
});

router.get("/projects/:projectId/containers/:containerId/shutdown/status", requireAuth, async (req, res): Promise<void> => {
  const status = gracefulShutdownService.getStatus(req.params.containerId as string);
  res.json(status);
});

router.post("/projects/:projectId/containers/:containerId/shutdown", requireAuth, async (req, res): Promise<void> => {
  const status = await gracefulShutdownService.initiateShutdown(req.params.containerId as string);
  res.json(status);
});

router.post("/projects/:projectId/containers/:containerId/shutdown/force", requireAuth, async (req, res): Promise<void> => {
  const status = await gracefulShutdownService.forceShutdown(req.params.containerId as string);
  res.json(status);
});

router.post("/projects/:projectId/containers/:containerId/shutdown/hooks", requireAuth, async (req, res): Promise<void> => {
  const config = gracefulShutdownService.addHook(req.params.containerId as string, req.body);
  res.json(config);
});

router.delete("/projects/:projectId/containers/:containerId/shutdown/hooks/:hookName", requireAuth, async (req, res): Promise<void> => {
  const config = gracefulShutdownService.removeHook(req.params.containerId as string, req.params.hookName as string);
  res.json(config);
});

export default router;
