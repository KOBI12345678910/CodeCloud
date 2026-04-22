import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { generateStarterFiles } from "../services/starter-gen";

const router: IRouter = Router();

router.post("/ai/starter-files", requireAuth, async (req, res): Promise<void> => {
  const { description, language } = req.body;
  if (!description) { res.status(400).json({ error: "description required" }); return; }
  try { res.json(generateStarterFiles(description, language)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
