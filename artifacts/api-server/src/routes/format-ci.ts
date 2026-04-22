import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { formatCIService } from "../jobs/format-ci";

const router: IRouter = Router();

router.get("/projects/:projectId/format-ci", requireAuth, async (req, res): Promise<void> => {
  const cfg = formatCIService.getConfig(req.params.projectId as string);
  res.json(cfg);
});

router.put("/projects/:projectId/format-ci", requireAuth, async (req, res): Promise<void> => {
  const cfg = formatCIService.updateConfig(req.params.projectId as string, req.body);
  res.json(cfg);
});

router.post("/projects/:projectId/format-ci/run", requireAuth, async (req, res): Promise<void> => {
  const run = await formatCIService.runFormat(req.params.projectId as string, req.body.trigger || "manual");
  res.json(run);
});

export default router;
