import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { analyzeCodeStyle, generateStyleGuide, autoFormatCode } from "../services/ai-style";

const router: IRouter = Router();

router.post("/ai/style/analyze", requireAuth, async (req, res): Promise<void> => {
  const { code, language } = req.body;
  if (!code) { res.status(400).json({ error: "code required" }); return; }
  try { res.json(analyzeCodeStyle(code, language)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/ai/style/guide", requireAuth, async (req, res): Promise<void> => {
  const { projectName } = req.body;
  try { res.json(generateStyleGuide(projectName || "Project")); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/ai/style/format", requireAuth, async (req, res): Promise<void> => {
  const { code } = req.body;
  if (!code) { res.status(400).json({ error: "code required" }); return; }
  try { res.json(autoFormatCode(code)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
