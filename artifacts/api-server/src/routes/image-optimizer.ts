import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { analyzeDockerfile } from "../services/image-optimizer";

const router: IRouter = Router();

router.post("/projects/:id/docker/analyze", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const { dockerfile } = req.body;
  if (!dockerfile) { res.status(400).json({ error: "dockerfile content required" }); return; }
  try { res.json(analyzeDockerfile(dockerfile)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
