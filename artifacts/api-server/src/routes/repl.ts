import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { executeRepl, getSupportedLanguages, type ReplLanguage } from "../services/repl";

const router = Router();

router.get("/repl/languages", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  res.json({ languages: getSupportedLanguages() });
});

router.post("/repl/execute", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { language, code } = req.body;
  if (!language || !code) {
    res.status(400).json({ error: "language and code are required" }); return;
  }
  const supported = getSupportedLanguages();
  if (!supported.includes(language)) {
    res.status(400).json({ error: `Unsupported language. Supported: ${supported.join(", ")}` }); return;
  }
  const result = await executeRepl(language as ReplLanguage, code);
  res.json(result);
});

export default router;
