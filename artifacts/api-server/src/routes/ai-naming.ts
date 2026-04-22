import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { suggestVariableNames, enforceNamingConvention } from "../services/ai-naming";

const router: IRouter = Router();

router.post("/ai/naming-suggestions", requireAuth, async (req, res): Promise<void> => {
  const { code, variableName, context } = req.body;
  try { res.json(suggestVariableNames(code || "", variableName || "data", context || "")); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/ai/naming-convention", requireAuth, async (req, res): Promise<void> => {
  const { code, convention } = req.body;
  try { res.json(enforceNamingConvention(code || "", convention || "camelCase")); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
