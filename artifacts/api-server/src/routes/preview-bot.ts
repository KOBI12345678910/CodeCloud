import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { createPreviewDeployment, listPreviewDeployments } from "../services/preview-bot";

const router: IRouter = Router();

router.get("/projects/:id/preview-deployments", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(listPreviewDeployments(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/preview-deployments", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { prNumber, branch } = req.body;
  try { res.status(201).json(createPreviewDeployment(projectId, prNumber, branch)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
