import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { reviewPR } from "../services/pr-review";

const router: IRouter = Router();

router.post("/projects/:id/pr-review", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const { prId, repo, changes } = req.body;
  if (!prId || !changes) { res.status(400).json({ error: "prId and changes required" }); return; }
  try { res.json(reviewPR(prId, repo || "repo", changes)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
