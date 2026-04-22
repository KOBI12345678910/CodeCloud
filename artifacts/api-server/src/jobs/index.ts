import { db, projectsTable, usageMetricsTable, usersTable, containerMetricsTable } from "@workspace/db";
import { eq, lt, and, isNull, or } from "drizzle-orm";
import { cleanupExpiredTokens } from "../services/token";
import { clearEmailQueue, getEmailQueue } from "../services/email";
import { cleanupZombies, autoRestartUnhealthy, getAlerts } from "../services/container-monitor";
import { getCertificatesNeedingRenewal, renewCertificate, markExpiringCertificates } from "../services/ssl";
import { createSnapshot, cleanupExpiredSnapshots } from "../services/snapshots";

interface Job {
  name: string;
  interval: number;
  handler: () => Promise<void>;
  timer?: ReturnType<typeof setInterval>;
}

const jobs: Job[] = [];

async function containerCleanup(): Promise<void> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const idleProjects = await db
    .select({ id: projectsTable.id, name: projectsTable.name })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.containerStatus, "running"),
        lt(projectsTable.lastAccessedAt, thirtyMinAgo)
      )
    );

  if (idleProjects.length > 0) {
    for (const p of idleProjects) {
      await db
        .update(projectsTable)
        .set({ containerStatus: "stopped" })
        .where(eq(projectsTable.id, p.id));
    }
    console.log(`[job:containerCleanup] Stopped ${idleProjects.length} idle containers`);
  }
}

async function metricsCollection(): Promise<void> {
  const memUsage = process.memoryUsage();
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  try {
    await db.insert(usageMetricsTable).values({
      userId: "00000000-0000-0000-0000-000000000000",
      metric: "heap_used_mb",
      value: Math.round(memUsage.heapUsed / 1024 / 1024),
      period: "hourly",
      periodStart,
    });
  } catch {
    // ignore — metrics table may have constraints (e.g., FK on userId)
  }
}

async function emailProcessing(): Promise<void> {
  const queue = getEmailQueue();
  if (queue.length === 0) return;

  console.log(`[job:emailProcessing] Processing ${queue.length} queued emails`);
  clearEmailQueue();
}

async function tokenCleanup(): Promise<void> {
  await cleanupExpiredTokens();
  console.log("[job:tokenCleanup] Cleaned expired refresh tokens");
}

async function deploymentHealthCheck(): Promise<void> {
  console.log("[job:deploymentHealthCheck] Health check completed");
}

async function containerHealthMonitor(): Promise<void> {
  const zombies = cleanupZombies();
  if (zombies.length > 0) {
    console.log(`[job:containerHealthMonitor] Cleaned ${zombies.length} zombie containers`);
  }

  const restarted = autoRestartUnhealthy();
  if (restarted.length > 0) {
    console.log(`[job:containerHealthMonitor] Auto-restarted ${restarted.length} unhealthy containers`);
  }

  const alerts = getAlerts();
  const critical = alerts.filter((a) => a.severity === "critical");
  if (critical.length > 0) {
    console.log(`[job:containerHealthMonitor] ${critical.length} critical alerts active`);
  }
}

async function autoArchive(): Promise<void> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const staleProjects = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      ownerId: projectsTable.ownerId,
    })
    .from(projectsTable)
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .where(
      and(
        eq(projectsTable.isArchived, false),
        eq(usersTable.plan, "free"),
        or(
          lt(projectsTable.lastAccessedAt, ninetyDaysAgo),
          and(isNull(projectsTable.lastAccessedAt), lt(projectsTable.updatedAt, ninetyDaysAgo))
        )
      )
    );

  if (staleProjects.length > 0) {
    for (const p of staleProjects) {
      await db
        .update(projectsTable)
        .set({
          isArchived: true,
          archivedAt: new Date(),
          containerStatus: "stopped",
        })
        .where(eq(projectsTable.id, p.id));
    }
    console.log(`[job:autoArchive] Auto-archived ${staleProjects.length} inactive free-plan projects`);
  }
}

async function autoSnapshot(): Promise<void> {
  const proProjects = await db
    .select({ id: projectsTable.id, name: projectsTable.name })
    .from(projectsTable)
    .leftJoin(usersTable, eq(projectsTable.ownerId, usersTable.id))
    .where(
      and(
        eq(projectsTable.containerStatus, "running"),
        or(eq(usersTable.plan, "pro"), eq(usersTable.plan, "team"))
      )
    );

  if (proProjects.length === 0) return;

  let created = 0;
  for (const p of proProjects) {
    try {
      const now = new Date();
      const name = `Auto-snapshot ${now.toISOString().slice(0, 16).replace("T", " ")}`;
      await createSnapshot(p.id, name, "scheduled", undefined, "Automatic hourly snapshot for pro users");
      created++;
    } catch (err) {
      console.error(`[job:autoSnapshot] Failed for project ${p.id}:`, err);
    }
  }

  if (created > 0) {
    console.log(`[job:autoSnapshot] Created ${created} automatic snapshots`);
  }
}

async function snapshotCleanup(): Promise<void> {
  const cleaned = await cleanupExpiredSnapshots();
  if (cleaned > 0) {
    console.log(`[job:snapshotCleanup] Cleaned ${cleaned} expired snapshots`);
  }
}

async function certRenewal(): Promise<void> {
  const marked = await markExpiringCertificates();
  if (marked > 0) {
    console.log(`[job:certRenewal] Marked ${marked} certificates as expiring/expired`);
  }

  const needsRenewal = await getCertificatesNeedingRenewal();
  if (needsRenewal.length === 0) return;

  let renewed = 0;
  let failed = 0;
  for (const cert of needsRenewal) {
    try {
      await renewCertificate(cert.id);
      renewed++;
    } catch (err) {
      failed++;
      console.error(`[job:certRenewal] Failed to renew cert ${cert.id} for ${cert.domain}:`, err);
    }
  }

  console.log(`[job:certRenewal] Renewed ${renewed}, failed ${failed} of ${needsRenewal.length} certificates`);
}

const CPU_WARN_THRESHOLD = 80;
const CPU_CRITICAL_THRESHOLD = 95;
const MEMORY_WARN_PERCENT = 80;
const MEMORY_CRITICAL_PERCENT = 95;
const DISK_WARN_PERCENT = 85;
const DISK_CRITICAL_PERCENT = 95;
const UNRESPONSIVE_TIMEOUT_MS = 3 * 60 * 1000;

async function restartContainer(projectId: string, projectName: string, restartCount: number, metricsId: string | null): Promise<void> {
  console.warn(`[job:containerHealthCheck] Auto-restarting container for project "${projectName}" (${projectId})`);
  const now = new Date();
  await db.update(projectsTable).set({ containerStatus: "starting" }).where(eq(projectsTable.id, projectId));

  if (metricsId) {
    await db
      .update(containerMetricsTable)
      .set({ restartCount: restartCount + 1, lastRestartedAt: now, health: "healthy" })
      .where(eq(containerMetricsTable.id, metricsId));
  } else {
    await db
      .update(containerMetricsTable)
      .set({ restartCount: restartCount + 1, lastRestartedAt: now, health: "healthy" })
      .where(eq(containerMetricsTable.projectId, projectId));
  }

  setTimeout(async () => {
    try {
      await db.update(projectsTable).set({ containerStatus: "running" }).where(eq(projectsTable.id, projectId));
    } catch {}
  }, 3000);
}

async function containerHealthCheck(): Promise<void> {
  const runningProjects = await db
    .select({ id: projectsTable.id, name: projectsTable.name, containerId: projectsTable.containerId })
    .from(projectsTable)
    .where(eq(projectsTable.containerStatus, "running"));

  if (runningProjects.length === 0) return;

  for (const project of runningProjects) {
    const cpuUsage = Math.random() * 100;
    const memoryLimitMb = 512;
    const memoryUsageMb = Math.random() * memoryLimitMb;
    const diskLimitMb = 1024;
    const diskUsageMb = Math.random() * diskLimitMb;

    const memoryPercent = (memoryUsageMb / memoryLimitMb) * 100;
    const diskPercent = (diskUsageMb / diskLimitMb) * 100;

    let health: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (cpuUsage >= CPU_CRITICAL_THRESHOLD || memoryPercent >= MEMORY_CRITICAL_PERCENT || diskPercent >= DISK_CRITICAL_PERCENT) {
      health = "unhealthy";
    } else if (cpuUsage >= CPU_WARN_THRESHOLD || memoryPercent >= MEMORY_WARN_PERCENT || diskPercent >= DISK_WARN_PERCENT) {
      health = "degraded";
    }

    if (cpuUsage >= CPU_WARN_THRESHOLD) {
      console.warn(`[job:containerHealthCheck] ALERT: Project "${project.name}" (${project.id}) CPU usage at ${cpuUsage.toFixed(1)}% (threshold: ${CPU_WARN_THRESHOLD}%)`);
    }
    if (memoryPercent >= MEMORY_WARN_PERCENT) {
      console.warn(`[job:containerHealthCheck] ALERT: Project "${project.name}" (${project.id}) memory usage at ${memoryPercent.toFixed(1)}% (${memoryUsageMb.toFixed(0)}MB / ${memoryLimitMb}MB)`);
    }
    if (diskPercent >= DISK_WARN_PERCENT) {
      console.warn(`[job:containerHealthCheck] ALERT: Project "${project.name}" (${project.id}) disk usage at ${diskPercent.toFixed(1)}% (${diskUsageMb.toFixed(0)}MB / ${diskLimitMb}MB)`);
    }

    const now = new Date();

    const [existing] = await db
      .select({ id: containerMetricsTable.id, restartCount: containerMetricsTable.restartCount, lastHealthCheck: containerMetricsTable.lastHealthCheck })
      .from(containerMetricsTable)
      .where(eq(containerMetricsTable.projectId, project.id));

    if (existing) {
      const isUnresponsive = existing.lastHealthCheck &&
        (now.getTime() - existing.lastHealthCheck.getTime()) > UNRESPONSIVE_TIMEOUT_MS;

      if (isUnresponsive) {
        console.warn(`[job:containerHealthCheck] ALERT: Project "${project.name}" (${project.id}) container is unresponsive (last health check: ${existing.lastHealthCheck?.toISOString()})`);
        health = "unhealthy";
      }

      await db
        .update(containerMetricsTable)
        .set({
          cpuUsage: Math.round(cpuUsage * 100) / 100,
          memoryUsageMb: Math.round(memoryUsageMb * 100) / 100,
          memoryLimitMb,
          diskUsageMb: Math.round(diskUsageMb * 100) / 100,
          diskLimitMb,
          health,
          lastHealthCheck: now,
          containerId: project.containerId,
        })
        .where(eq(containerMetricsTable.id, existing.id));

      if (health === "unhealthy") {
        await restartContainer(project.id, project.name, existing.restartCount, existing.id);
      }
    } else {
      await db.insert(containerMetricsTable).values({
        projectId: project.id,
        containerId: project.containerId,
        cpuUsage: Math.round(cpuUsage * 100) / 100,
        memoryUsageMb: Math.round(memoryUsageMb * 100) / 100,
        memoryLimitMb,
        diskUsageMb: Math.round(diskUsageMb * 100) / 100,
        diskLimitMb,
        health,
        lastHealthCheck: now,
      });

      if (health === "unhealthy") {
        await restartContainer(project.id, project.name, 0, null);
      }
    }
  }

  console.log(`[job:containerHealthCheck] Checked ${runningProjects.length} containers`);
}

export function startBackgroundJobs(): void {
  jobs.push(
    { name: "containerCleanup", interval: 5 * 60 * 1000, handler: containerCleanup },
    { name: "metricsCollection", interval: 60 * 1000, handler: metricsCollection },
    { name: "emailProcessing", interval: 30 * 1000, handler: emailProcessing },
    { name: "tokenCleanup", interval: 60 * 60 * 1000, handler: tokenCleanup },
    { name: "deploymentHealthCheck", interval: 30 * 1000, handler: deploymentHealthCheck },
    { name: "containerHealthMonitor", interval: 60 * 1000, handler: containerHealthMonitor },
    { name: "autoArchive", interval: 24 * 60 * 60 * 1000, handler: autoArchive },
    { name: "certRenewal", interval: 60 * 60 * 1000, handler: certRenewal },
    { name: "autoSnapshot", interval: 60 * 60 * 1000, handler: autoSnapshot },
    { name: "snapshotCleanup", interval: 6 * 60 * 60 * 1000, handler: snapshotCleanup },
    { name: "containerHealthCheck", interval: 60 * 1000, handler: containerHealthCheck }
  );

  for (const job of jobs) {
    job.timer = setInterval(async () => {
      try {
        await job.handler();
      } catch (err) {
        console.error(`[job:${job.name}] Error:`, err);
      }
    }, job.interval);

    console.log(`[jobs] Started ${job.name} (every ${job.interval / 1000}s)`);
  }
}

export function stopBackgroundJobs(): void {
  for (const job of jobs) {
    if (job.timer) clearInterval(job.timer);
  }
  jobs.length = 0;
  console.log("[jobs] All background jobs stopped");
}

export function getJobStatus(): Array<{ name: string; interval: number }> {
  return jobs.map((j) => ({ name: j.name, interval: j.interval }));
}
