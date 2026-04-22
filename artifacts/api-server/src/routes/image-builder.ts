import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { analyzeDockerfile, simulateBuild } from "../services/image-builder";

const router: IRouter = Router();

router.post("/docker/analyze", requireAuth, async (req, res): Promise<void> => {
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "Dockerfile content required" }); return; }
  try { res.json(analyzeDockerfile(content)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/docker/build", requireAuth, async (req, res): Promise<void> => {
  const { dockerfile, imageName, tag } = req.body;
  if (!dockerfile || !imageName) { res.status(400).json({ error: "dockerfile and imageName required" }); return; }
  try { res.json(simulateBuild(dockerfile, imageName, tag)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
