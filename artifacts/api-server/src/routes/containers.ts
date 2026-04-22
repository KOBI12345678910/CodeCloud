import { Router, type IRouter } from "express";
import { db, projectsTable, containerMetricsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import * as monitor from "../services/container-monitor";

const router: IRouter = Router();

const requireAdmin = async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

router.get("/containers/status", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  monitor.seedDemoContainers();

  const monitorContainers = monitor.getAllContainers();
  const monitorSummary = monitor.getSummary();
  const alerts = monitor.getAlerts();

  const rows = await db
    .select({
      projectId: projectsTable.id,
      projectName: projectsTable.name,
      projectSlug: projectsTable.slug,
      language: projectsTable.language,
      ownerId: projectsTable.ownerId,
      containerStatus: projectsTable.containerStatus,
      containerId: projectsTable.containerId,
      cpuUsage: containerMetricsTable.cpuUsage,
      memoryUsageMb: containerMetricsTable.memoryUsageMb,
      memoryLimitMb: containerMetricsTable.memoryLimitMb,
      diskUsageMb: containerMetricsTable.diskUsageMb,
      diskLimitMb: containerMetricsTable.diskLimitMb,
      health: containerMetricsTable.health,
      restartCount: containerMetricsTable.restartCount,
      lastHealthCheck: containerMetricsTable.lastHealthCheck,
      lastRestartedAt: containerMetricsTable.lastRestartedAt,
    })
    .from(projectsTable)
    .leftJoin(containerMetricsTable, eq(projectsTable.id, containerMetricsTable.projectId))
    .where(eq(projectsTable.containerStatus, "running"));

  const dbContainers = rows.map((row) => ({
    projectId: row.projectId,
    projectName: row.projectName,
    projectSlug: row.projectSlug,
    language: row.language,
    ownerId: row.ownerId,
    containerStatus: row.containerStatus,
    containerId: row.containerId,
    cpuUsage: row.cpuUsage ?? 0,
    memoryUsageMb: row.memoryUsageMb ?? 0,
    memoryLimitMb: row.memoryLimitMb ?? 512,
    diskUsageMb: row.diskUsageMb ?? 0,
    diskLimitMb: row.diskLimitMb ?? 1024,
    health: row.health ?? "healthy",
    restartCount: row.restartCount ?? 0,
    lastHealthCheck: row.lastHealthCheck ?? null,
    lastRestartedAt: row.lastRestartedAt ?? null,
  }));

  const dbSummary = {
    totalActive: dbContainers.length,
    healthy: dbContainers.filter(c => c.health === "healthy").length,
    degraded: dbContainers.filter(c => c.health === "degraded").length,
    unhealthy: dbContainers.filter(c => c.health === "unhealthy").length,
  };

  res.json({
    summary: monitorSummary,
    containers: monitorContainers,
    alerts,
    dbContainers,
    dbSummary,
    thresholds: {
      cpuWarning: 80,
      cpuCritical: 95,
      memoryWarning: 80,
      memoryCritical: 95,
      diskWarning: 80,
      diskCritical: 95,
    },
  });
});

router.get("/containers/:containerId", requireAuth, async (req, res): Promise<void> => {
  const containerId = req.params.containerId as string;
  const container = monitor.getContainer(containerId);
  if (!container) {
    res.status(404).json({ error: "Container not found" });
    return;
  }
  res.json({ container });
});

router.post("/containers/:containerId/restart", requireAuth, async (req, res): Promise<void> => {
  const containerId = req.params.containerId as string;
  const container = monitor.restartContainer(containerId);
  if (!container) {
    res.status(404).json({ error: "Container not found" });
    return;
  }
  res.json({ message: "Container restarted", container });
});

router.post("/containers/:containerId/stop", requireAuth, async (req, res): Promise<void> => {
  const containerId = req.params.containerId as string;
  const container = monitor.stopContainer(containerId);
  if (!container) {
    res.status(404).json({ error: "Container not found" });
    return;
  }
  res.json({ message: "Container stopped", container });
});

router.delete("/containers/:containerId", requireAuth, async (req, res): Promise<void> => {
  const containerId = req.params.containerId as string;
  const removed = monitor.removeContainer(containerId);
  if (!removed) {
    res.status(404).json({ error: "Container not found" });
    return;
  }
  res.json({ message: "Container removed" });
});

router.get("/containers/project/:projectId", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params.projectId as string;
  const containers = monitor.getContainersByProject(projectId);
  res.json({ containers, total: containers.length });
});

router.post("/containers/cleanup-zombies", requireAuth, async (_req, res): Promise<void> => {
  const cleaned = monitor.cleanupZombies();
  res.json({ message: `Cleaned ${cleaned.length} zombie containers`, cleaned });
});

router.post("/containers/auto-restart", requireAuth, async (_req, res): Promise<void> => {
  const restarted = monitor.autoRestartUnhealthy();
  res.json({ message: `Auto-restarted ${restarted.length} unhealthy containers`, restarted });
});

router.get("/containers/alerts/all", requireAuth, async (_req, res): Promise<void> => {
  const alerts = monitor.getAlerts();
  res.json({ alerts, total: alerts.length });
});

export default router;
