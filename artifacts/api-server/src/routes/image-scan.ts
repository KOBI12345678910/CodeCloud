import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { scanImage } from "../services/image-scan";

const router: IRouter = Router();

router.post("/docker/scan", requireAuth, async (req, res): Promise<void> => {
  const { imageName, tag } = req.body;
  if (!imageName) { res.status(400).json({ error: "imageName required" }); return; }
  try { res.json(scanImage(imageName, tag)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
