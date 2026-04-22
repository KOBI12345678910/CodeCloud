import { Router, Request, Response } from "express";
import { auditLogService } from "../services/audit-log";
const router = Router();
router.get("/audit-log", (req: Request, res: Response): void => { res.json(auditLogService.list({ userId: req.query.userId as string, action: req.query.action as string, resource: req.query.resource as string }, Number(req.query.limit) || 100)); });
router.post("/audit-log", (req: Request, res: Response): void => { res.status(201).json(auditLogService.log(req.body)); });
router.get("/audit-log/stats", (req: Request, res: Response): void => { res.json(auditLogService.getStats(Number(req.query.days) || 30)); });
router.get("/audit-log/export", (req: Request, res: Response): void => { const format = (req.query.format as string) === "csv" ? "csv" : "json"; res.type(format === "csv" ? "text/csv" : "application/json").send(auditLogService.export(format)); });
router.get("/audit-log/:id", (req: Request, res: Response): void => { const e = auditLogService.get(req.params.id as string); e ? res.json(e) : res.status(404).json({ error: "Not found" }); });
export default router;
