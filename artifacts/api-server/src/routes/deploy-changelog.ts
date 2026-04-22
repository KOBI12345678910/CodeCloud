import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { generateDeployChangelog } from "../services/deploy-changelog";

const router: IRouter = Router();

router.get("/projects/:id/deploy-changelog", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const from = (req.query.from as string) || "v1.0.0";
  const to = (req.query.to as string) || "v2.0.0";
  try { res.json(generateDeployChangelog(projectId, from, to)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
