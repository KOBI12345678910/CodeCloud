import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { generateAPIDesign, generateClientSDK } from "../services/ai-api-design";

const router: IRouter = Router();

router.post("/ai/api-design", requireAuth, async (req, res): Promise<void> => {
  const { description } = req.body;
  if (!description) { res.status(400).json({ error: "description required" }); return; }
  try { res.json(generateAPIDesign(description)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/ai/api-design/sdk", requireAuth, async (req, res): Promise<void> => {
  const { endpoints } = req.body;
  if (!endpoints || !Array.isArray(endpoints)) { res.status(400).json({ error: "endpoints array required" }); return; }
  try { res.json({ code: generateClientSDK(endpoints) }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
