import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getPolicies, getTemplates, togglePolicy, deletePolicy } from "../services/network-policy";

const router: IRouter = Router();

router.get("/network-policies/:projectId", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  try { res.json(getPolicies(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/network-policies-templates", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(getTemplates()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/network-policies/:id/toggle", requireAuth, async (req, res): Promise<void> => {
  const result = togglePolicy(req.params.id as string);
  if (!result) { res.status(404).json({ error: "Policy not found" }); return; }
  res.json(result);
});

router.delete("/network-policies/:id", requireAuth, async (req, res): Promise<void> => {
  const ok = deletePolicy(req.params.id as string);
  if (!ok) { res.status(404).json({ error: "Policy not found" }); return; }
  res.json({ success: true });
});

export default router;
