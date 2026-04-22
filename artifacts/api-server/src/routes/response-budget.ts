import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getBudgets, getAlerts, updateBudget, acknowledgeAlert } from "../services/response-budget";

const router: IRouter = Router();

router.get("/response-budget/endpoints", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(getBudgets()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/response-budget/alerts", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(getAlerts()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/response-budget/:id", requireAuth, async (req, res): Promise<void> => {
  const result = updateBudget(req.params.id as string, req.body.targetMs);
  if (!result) { res.status(404).json({ error: "Budget not found" }); return; }
  res.json(result);
});

router.post("/response-budget/alerts/:id/acknowledge", requireAuth, async (req, res): Promise<void> => {
  const result = acknowledgeAlert(req.params.id as string);
  if (!result) { res.status(404).json({ error: "Alert not found" }); return; }
  res.json(result);
});

export default router;
