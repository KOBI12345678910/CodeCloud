import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { designModel } from "../services/ai-data-model";

const router: IRouter = Router();

router.post("/ai/data-model", requireAuth, async (req, res): Promise<void> => {
  try {
    const { description } = req.body;
    if (!description) { res.status(400).json({ error: "Description required" }); return; }
    res.json(designModel(description));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
