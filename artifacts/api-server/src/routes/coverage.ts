import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import {
  createCoverageReport, completeCoverageReport, failCoverageReport,
  getCoverageReport, listCoverageReports, getLatestCoverage,
  getFileCoverage, deleteCoverageReport,
} from "../services/coverage";

const router: IRouter = Router();

router.post("/projects/:id/coverage/run", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = (req as AuthenticatedRequest).userId;
  const { command } = req.body;
  if (!command || typeof command !== "string") {
    res.status(400).json({ error: "command is required" }); return;
  }
  try {
    const report = await createCoverageReport(projectId, userId, command.trim());
    res.status(201).json(report);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/coverage/:reportId/complete", requireAuth, async (req, res): Promise<void> => {
  const reportId = Array.isArray(req.params.reportId) ? req.params.reportId[0] : req.params.reportId;
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const report = await getCoverageReport(reportId);
    if (!report) { res.status(404).json({ error: "Report not found" }); return; }
    if (report.userId !== userId) { res.status(403).json({ error: "Not report owner" }); return; }
    const updated = await completeCoverageReport(reportId, req.body);
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/coverage/:reportId/fail", requireAuth, async (req, res): Promise<void> => {
  const reportId = Array.isArray(req.params.reportId) ? req.params.reportId[0] : req.params.reportId;
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const report = await getCoverageReport(reportId);
    if (!report) { res.status(404).json({ error: "Report not found" }); return; }
    if (report.userId !== userId) { res.status(403).json({ error: "Not report owner" }); return; }
    const updated = await failCoverageReport(reportId, req.body.output || "");
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/coverage/:reportId", requireAuth, async (req, res): Promise<void> => {
  const reportId = Array.isArray(req.params.reportId) ? req.params.reportId[0] : req.params.reportId;
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const report = await getCoverageReport(reportId);
    if (!report) { res.status(404).json({ error: "Report not found" }); return; }
    if (report.userId !== userId) { res.status(403).json({ error: "Not report owner" }); return; }
    res.json(report);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/coverage", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const reports = await listCoverageReports(projectId);
    res.json(reports);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/coverage/latest", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const latest = await getLatestCoverage(projectId);
    res.json(latest);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/coverage/file", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const filePath = req.query.path as string;
  if (!filePath) { res.status(400).json({ error: "path query param required" }); return; }
  try {
    const coverage = await getFileCoverage(projectId, filePath);
    res.json(coverage);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/coverage/:reportId", requireAuth, async (req, res): Promise<void> => {
  const reportId = Array.isArray(req.params.reportId) ? req.params.reportId[0] : req.params.reportId;
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const report = await getCoverageReport(reportId);
    if (!report) { res.status(404).json({ error: "Report not found" }); return; }
    if (report.userId !== userId) { res.status(403).json({ error: "Not report owner" }); return; }
    await deleteCoverageReport(reportId);
    res.sendStatus(204);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
