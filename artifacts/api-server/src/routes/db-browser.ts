import { Router, Request, Response } from "express";
import { dbBrowserService } from "../services/db-browser";
const router = Router();
router.get("/db-browser/tables", (_req: Request, res: Response): void => { res.json(dbBrowserService.getTables()); });
router.get("/db-browser/tables/:name", (req: Request, res: Response): void => { const t = dbBrowserService.getTable(req.params.name as string); t ? res.json(t) : res.status(404).json({ error: "Not found" }); });
router.post("/db-browser/query", (req: Request, res: Response): void => { try { res.json(dbBrowserService.executeQuery(req.body.sql || "")); } catch (e: any) { res.status(400).json({ error: e.message }); } });
router.get("/db-browser/schema", (_req: Request, res: Response): void => { res.type("text/plain").send(dbBrowserService.getSchemaSQL()); });
export default router;
