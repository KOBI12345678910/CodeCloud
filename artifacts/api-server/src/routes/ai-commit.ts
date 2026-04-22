import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { generateCommitMessage } from "../services/ai-commit";

const router: IRouter = Router();

router.post("/ai/commit-message", requireAuth, async (req, res): Promise<void> => {
  const { changes } = req.body;
  if (!changes || !Array.isArray(changes)) { res.status(400).json({ error: "changes array required" }); return; }
  try { res.json(generateCommitMessage(changes)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
