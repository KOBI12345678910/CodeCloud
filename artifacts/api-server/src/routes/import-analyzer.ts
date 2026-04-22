import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { analyzeImports, organizeImports } from "../services/import-analyzer";

const router: IRouter = Router();

router.post("/imports/analyze", requireAuth, async (req, res): Promise<void> => {
  const { code, existingImports } = req.body;
  if (!code) { res.status(400).json({ error: "code is required" }); return; }
  try { res.json(analyzeImports(code, existingImports || [])); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/imports/organize", requireAuth, async (req, res): Promise<void> => {
  const { imports } = req.body;
  if (!imports || !Array.isArray(imports)) { res.status(400).json({ error: "imports array required" }); return; }
  try { res.json({ organized: organizeImports(imports) }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
