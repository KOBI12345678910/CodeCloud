import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { listTables, getTableRows, executeQuery, exportCsv } from "../services/database-proxy";

const router = Router();

router.get("/projects/:projectId/database/tables", requireAuth, async (_req, res): Promise<void> => {
  const tables = listTables();
  res.json(tables);
});

router.get("/projects/:projectId/database/tables/:tableName/rows", requireAuth, async (req, res): Promise<void> => {
  const tableName = String(req.params.tableName);
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const result = getTableRows(tableName, limit, offset);
  res.json(result);
});

router.post("/projects/:projectId/database/query", requireAuth, async (req, res): Promise<void> => {
  const { sql } = req.body;
  if (!sql?.trim()) {
    res.status(400).json({ error: "SQL query is required" });
    return;
  }
  try {
    const result = executeQuery(sql);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/projects/:projectId/database/tables/:tableName/export", requireAuth, async (req, res): Promise<void> => {
  const tableName = String(req.params.tableName);
  const csv = exportCsv(tableName);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${tableName}.csv"`);
  res.send(csv);
});

export default router;
