import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { naturalLanguageToSql, explainQuery } from "../services/ai-sql";

const router: IRouter = Router();

router.post("/ai/sql/generate", requireAuth, async (req, res): Promise<void> => {
  const { question, schema } = req.body;
  if (!question) { res.status(400).json({ error: "question required" }); return; }
  try { res.json(naturalLanguageToSql(question, schema)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/ai/sql/explain", requireAuth, async (req, res): Promise<void> => {
  const { sql } = req.body;
  if (!sql) { res.status(400).json({ error: "sql required" }); return; }
  try { res.json(explainQuery(sql)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
