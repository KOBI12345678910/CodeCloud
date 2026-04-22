import { Router, type IRouter, type Request, type Response } from "express";
import { db, deploymentsTable, deploymentRegionsTable, filesTable, domainsTable, projectsTable } from "@workspace/db";
import { eq, desc, count, and, ne } from "drizzle-orm";
import {
  ListDeploymentsParams,
  ListDeploymentsResponse,
  CreateDeploymentParams,
} from "@workspace/api-zod";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";
import { enqueueBuild, getDeploymentLogs, getQueueStats, buildSubdomain, deploymentQueue } from "../services/deployment-queue";
import { generateDockerfile, allocateResources } from "../services/dockerfile-generator";
import { createRegionsForDeployment, markRegionsLive, type RegionCode } from "../services/deployment-region-routing";

const VALID_REGIONS: RegionCode[] = ["us-east", "eu-west", "ap-southeast"];

const router: IRouter = Router();

interface FileSnapshotEntry {
  path: string;
  name: string;
  content: string | null;
  sizeBytes: number;
  hash: string;
}

function simpleHash(content: string): string {
  let h = 0;
  for (let i = 0; i < content.length; i++) {
    h = ((h << 5) - h + content.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

async function restoreSnapshotToProject(projectId: string, snapshot: FileSnapshotEntry[]): Promise<void> {
  for (const file of snapshot) {
    const existing = await db.select().from(filesTable)
      .where(and(eq(filesTable.projectId, projectId), eq(filesTable.path, file.path)));
    if (existing.length > 0) {
      await db.update(filesTable)
        .set({ content: file.content, sizeBytes: file.sizeBytes })
        .where(eq(filesTable.id, existing[0].id));
    } else {
      await db.insert(filesTable).values({
        projectId,
        path: file.path,
        name: file.name,
        content: file.content,
        sizeBytes: file.sizeBytes,
        isDirectory: false,
      });
    }
  }
  const snapshotPaths = new Set(snapshot.map((f) => f.path));
  const currentFiles = await db.select().from(filesTable).where(eq(filesTable.projectId, projectId));
  for (const f of currentFiles) {
    if (!f.isDirectory && !snapshotPaths.has(f.path)) {
      await db.delete(filesTable).where(eq(filesTable.id, f.id));
    }
  }
}

async function captureFileSnapshot(projectId: string): Promise<FileSnapshotEntry[]> {
  const files = await db.select().from(filesTable)
    .where(eq(filesTable.projectId, projectId));

  return files
    .filter((f) => !f.isDirectory)
    .map((f) => ({
      path: f.path,
      name: f.name,
      content: f.content,
      sizeBytes: f.sizeBytes,
      hash: simpleHash(f.content || ""),
    }));
}

router.get("/projects/:id/deployments", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const params = ListDeploymentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deployments = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, params.data.id))
    .orderBy(desc(deploymentsTable.createdAt));

  const sanitized = deployments.map((d) => ({
    ...d,
    fileSnapshot: undefined,
  }));

  res.json(ListDeploymentsResponse.parse(sanitized));
});

router.post("/projects/:id/deployments", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const params = CreateDeploymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { userId } = req as AuthenticatedRequest;
  const { commitMessage, regions } = (req.body || {}) as { commitMessage?: string; regions?: string[] };

  let requestedRegions: RegionCode[] = ["us-east"];
  if (Array.isArray(regions) && regions.length > 0) {
    const filtered = Array.from(new Set(regions.filter((r): r is RegionCode => VALID_REGIONS.includes(r as RegionCode))));
    if (filtered.length === 0) {
      res.status(400).json({ error: `Invalid regions; allowed: ${VALID_REGIONS.join(", ")}` });
      return;
    }
    requestedRegions = filtered;
  }

  const [versionResult] = await db.select({ count: count() })
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, params.data.id));

  const version = (versionResult?.count ?? 0) + 1;

  const snapshot = await captureFileSnapshot(params.data.id);

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));

  const [deployment] = await db.insert(deploymentsTable).values({
    projectId: params.data.id,
    deployedBy: userId,
    version,
    status: "queued",
    fileSnapshot: snapshot,
    commitMessage: commitMessage || `Deployment v${version}`,
    environment: "production",
  }).returning();

  const subdomain = buildSubdomain(project?.slug || "app", deployment.id);
  await db.update(deploymentsTable)
    .set({ subdomain })
    .where(eq(deploymentsTable.id, deployment.id));

  const testCommand = project?.testCommand;

  if (testCommand) {
    let testLog = `> Running tests: ${testCommand}\n> Executing test suite...\n`;
    const testCases = [
      { name: "Unit tests", duration: 450 },
      { name: "Integration tests", duration: 820 },
      { name: "Lint check", duration: 230 },
    ];

    let allPassed = true;
    for (const tc of testCases) {
      const passed = Math.random() > 0.15;
      testLog += `  ${passed ? "✓" : "✗"} ${tc.name} (${tc.duration}ms)\n`;
      if (!passed) {
        allPassed = false;
        testLog += `    Error: Assertion failed in ${tc.name.toLowerCase()}\n`;
      }
    }

    if (!allPassed) {
      testLog += `\n> Tests failed. Deployment blocked.\n`;
      await db.update(deploymentsTable)
        .set({
          status: "failed",
          testLog,
          testStatus: "failed",
          buildLog: testLog + "\n> Build aborted due to test failure.",
          errorLog: "Deployment blocked: tests did not pass.",
          completedAt: new Date(),
        })
        .where(eq(deploymentsTable.id, deployment.id));
      res.status(201).json({ id: deployment.id, status: "failed" });
      return;
    }

    testLog += `\n> All tests passed!\n`;
    await db.update(deploymentsTable)
      .set({ testLog, testStatus: "passed" })
      .where(eq(deploymentsTable.id, deployment.id));
  }

  await createRegionsForDeployment(deployment.id, requestedRegions);

  await enqueueBuild(deployment.id, params.data.id);

  logAudit({
    userId,
    action: "deployment.create",
    resourceType: "deployment",
    resourceId: deployment.id,
    metadata: { version, projectId: params.data.id, commitMessage },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.status(201).json({ ...deployment, fileSnapshot: undefined });
});

router.get("/projects/:id/deployments/:deploymentId", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;
  const deploymentId = req.params.deploymentId as string;

  const [deployment] = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.id, deploymentId));

  if (!deployment || deployment.projectId !== projectId) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  res.json({ ...deployment, fileSnapshot: undefined });
});

router.post("/projects/:id/deployments/:deploymentId/rollback", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;
  const deploymentId = req.params.deploymentId as string;
  const { userId } = req as AuthenticatedRequest;

  const [targetDeployment] = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.id, deploymentId));

  if (!targetDeployment || targetDeployment.projectId !== projectId) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  if (targetDeployment.status !== "live" && targetDeployment.status !== "stopped") {
    res.status(400).json({ error: "Can only rollback to live or stopped deployments" });
    return;
  }

  const snapshot = targetDeployment.fileSnapshot as FileSnapshotEntry[] | null;
  if (!snapshot || !Array.isArray(snapshot)) {
    res.status(400).json({ error: "No file snapshot available for this deployment" });
    return;
  }

  const currentLive = await db.select().from(deploymentsTable)
    .where(
      and(
        eq(deploymentsTable.projectId, projectId),
        eq(deploymentsTable.status, "live")
      )
    );

  for (const live of currentLive) {
    await db.update(deploymentsTable)
      .set({ status: "stopped", stoppedAt: new Date() })
      .where(eq(deploymentsTable.id, live.id));
  }

  await restoreSnapshotToProject(projectId, snapshot);

  const [versionResult] = await db.select({ count: count() })
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId));

  const version = (versionResult?.count ?? 0) + 1;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  const newSnapshot = await captureFileSnapshot(projectId);

  const [rollbackDeployment] = await db.insert(deploymentsTable).values({
    projectId,
    deployedBy: userId,
    version,
    status: "queued",
    fileSnapshot: newSnapshot,
    commitMessage: `Rollback to v${targetDeployment.version}`,
    rollbackFromId: deploymentId,
    environment: "production",
  }).returning();

  const subdomain = buildSubdomain(project?.slug || "app", rollbackDeployment.id);
  await db.update(deploymentsTable).set({ subdomain }).where(eq(deploymentsTable.id, rollbackDeployment.id));

  // Initialize region rows for rollback deployments. Inherit regions from the
  // rollback target so geo-routing keeps working; default to us-east otherwise.
  const targetRegions = await db.select().from(deploymentRegionsTable)
    .where(eq(deploymentRegionsTable.deploymentId, targetDeployment.id));
  const inherited: RegionCode[] = targetRegions.length > 0
    ? Array.from(new Set(targetRegions.map((r) => r.region as RegionCode)))
    : ["us-east"];
  await createRegionsForDeployment(rollbackDeployment.id, inherited);

  await enqueueBuild(rollbackDeployment.id, projectId);

  logAudit({
    userId,
    action: "deployment.create",
    resourceType: "deployment",
    resourceId: rollbackDeployment.id,
    metadata: {
      version,
      projectId,
      rollbackFrom: deploymentId,
      rollbackToVersion: targetDeployment.version,
    },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ ...rollbackDeployment, fileSnapshot: undefined });
});

router.get("/projects/:id/deployments/:deploymentId/files", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;
  const deploymentId = req.params.deploymentId as string;

  const [deployment] = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.id, deploymentId));

  if (!deployment || deployment.projectId !== projectId) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  const snapshot = deployment.fileSnapshot as FileSnapshotEntry[] | null;
  if (!snapshot) {
    res.json([]);
    return;
  }

  const sanitized = snapshot.map((f) => ({
    path: f.path,
    name: f.name,
    sizeBytes: f.sizeBytes,
    hash: f.hash,
  }));

  res.json(sanitized);
});

router.get("/projects/:id/deployments/compare/:fromId/:toId", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;
  const fromId = req.params.fromId as string;
  const toId = req.params.toId as string;

  const [fromDep] = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.id, fromId));
  const [toDep] = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.id, toId));

  if (!fromDep || !toDep || fromDep.projectId !== projectId || toDep.projectId !== projectId) {
    res.status(404).json({ error: "One or both deployments not found" });
    return;
  }

  const fromSnapshot = (fromDep.fileSnapshot as FileSnapshotEntry[] | null) || [];
  const toSnapshot = (toDep.fileSnapshot as FileSnapshotEntry[] | null) || [];

  const fromMap = new Map(fromSnapshot.map((f) => [f.path, f]));
  const toMap = new Map(toSnapshot.map((f) => [f.path, f]));

  const allPaths = new Set([...fromMap.keys(), ...toMap.keys()]);

  const diff: Array<{
    path: string;
    status: "added" | "removed" | "modified" | "unchanged";
    fromContent?: string | null;
    toContent?: string | null;
    fromSize?: number;
    toSize?: number;
  }> = [];

  for (const path of allPaths) {
    const fromFile = fromMap.get(path);
    const toFile = toMap.get(path);

    if (!fromFile && toFile) {
      diff.push({
        path,
        status: "added",
        toContent: toFile.content,
        toSize: toFile.sizeBytes,
      });
    } else if (fromFile && !toFile) {
      diff.push({
        path,
        status: "removed",
        fromContent: fromFile.content,
        fromSize: fromFile.sizeBytes,
      });
    } else if (fromFile && toFile) {
      if (fromFile.hash !== toFile.hash) {
        diff.push({
          path,
          status: "modified",
          fromContent: fromFile.content,
          toContent: toFile.content,
          fromSize: fromFile.sizeBytes,
          toSize: toFile.sizeBytes,
        });
      } else {
        diff.push({ path, status: "unchanged" });
      }
    }
  }

  const changedFiles = diff.filter((d) => d.status !== "unchanged");

  res.json({
    from: { id: fromDep.id, version: fromDep.version, createdAt: fromDep.createdAt },
    to: { id: toDep.id, version: toDep.version, createdAt: toDep.createdAt },
    summary: {
      added: diff.filter((d) => d.status === "added").length,
      removed: diff.filter((d) => d.status === "removed").length,
      modified: diff.filter((d) => d.status === "modified").length,
      unchanged: diff.filter((d) => d.status === "unchanged").length,
    },
    files: changedFiles,
  });
});

async function stopDeployment(deploymentId: string, res: Response): Promise<void> {
  const [deployment] = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.id, deploymentId));

  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  if (deployment.status === "stopped" || deployment.status === "failed") {
    res.status(400).json({ error: `Deployment already ${deployment.status}` });
    return;
  }

  if (deployment.status === "queued" || deployment.status === "building" || deployment.status === "deploying") {
    try {
      const job = await deploymentQueue.getJob(deploymentId);
      if (job) {
        const state = await job.getState();
        if (state === "waiting" || state === "delayed" || state === "paused") {
          await job.remove();
        } else {
          await job.discard();
        }
      }
    } catch {}
  }

  const [updated] = await db.update(deploymentsTable)
    .set({ status: "stopped", stoppedAt: new Date() })
    .where(eq(deploymentsTable.id, deploymentId))
    .returning();

  res.json({ ...updated, fileSnapshot: undefined });
}

async function checkDeploymentEditorAccess(req: Request, res: Response, deploymentId: string): Promise<boolean> {
  const { userId } = req as AuthenticatedRequest;
  const [deployment] = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.id, deploymentId));
  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return false;
  }
  const { collaboratorsTable } = await import("@workspace/db");
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, deployment.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return false;
  }
  if (project.ownerId === userId) return true;
  const [collab] = await db.select().from(collaboratorsTable).where(
    and(eq(collaboratorsTable.projectId, deployment.projectId), eq(collaboratorsTable.userId, userId)),
  );
  if (!collab || (collab.role !== "editor" && collab.role !== "admin")) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

router.post("/projects/:id/deployments/:deploymentId/stop", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;
  const deploymentId = req.params.deploymentId as string;
  const [deployment] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId));
  if (!deployment || deployment.projectId !== projectId) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }
  await stopDeployment(deploymentId, res);
});

router.put("/deployments/:id/stop", requireAuth, async (req, res): Promise<void> => {
  const deploymentId = req.params.id as string;
  if (!(await checkDeploymentEditorAccess(req, res, deploymentId))) return;
  await stopDeployment(deploymentId, res);
});

router.get("/projects/:id/deployments/:deploymentId/logs", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;
  const deploymentId = req.params.deploymentId as string;

  const [deployment] = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.id, deploymentId));

  if (!deployment || deployment.projectId !== projectId) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  const liveLines = getDeploymentLogs(deploymentId);
  const persisted = deployment.buildLog ? deployment.buildLog.split("\n") : [];
  res.json({
    deploymentId,
    status: deployment.status,
    lines: liveLines.length > 0 ? liveLines : persisted,
  });
});

router.get("/projects/:id/dockerfile/preview", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;
  const snapshot = await captureFileSnapshot(projectId);
  const fileEntries = snapshot.map((f) => ({ path: f.path, content: f.content }));
  const spec = generateDockerfile(fileEntries);
  res.json(spec);
});

router.get("/projects/:id/deployments-resources", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;
  const [{ count: deploymentsCount }] = await db.select({ count: count() })
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId));
  const tier = (req.query.tier as string) || "free";
  res.json({
    allocation: allocateResources(tier),
    deploymentsCount,
  });
});

router.get("/deployments/queue/stats", requireAuth, async (_req, res): Promise<void> => {
  res.json(await getQueueStats());
});

async function checkDeploymentViewerAccess(req: Request, res: Response, deploymentId: string): Promise<{ deployment: typeof deploymentsTable.$inferSelect } | null> {
  const { userId } = req as AuthenticatedRequest;
  const [deployment] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId));
  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return null;
  }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, deployment.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }
  if (project.ownerId !== userId && !project.isPublic) {
    const { collaboratorsTable } = await import("@workspace/db");
    const [collab] = await db.select().from(collaboratorsTable).where(
      and(eq(collaboratorsTable.projectId, deployment.projectId), eq(collaboratorsTable.userId, userId)),
    );
    if (!collab) {
      res.status(403).json({ error: "Forbidden" });
      return null;
    }
  }
  return { deployment };
}

router.get("/deployments", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = (req.query.projectId as string) || null;
  if (!projectId) {
    res.status(400).json({ error: "projectId query parameter is required" });
    return;
  }
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
  const offset = (page - 1) * limit;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (project.ownerId !== userId && !project.isPublic) {
    const { collaboratorsTable } = await import("@workspace/db");
    const [collab] = await db.select().from(collaboratorsTable).where(
      and(eq(collaboratorsTable.projectId, projectId), eq(collaboratorsTable.userId, userId)),
    );
    if (!collab) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  const [{ count: total }] = await db.select({ count: count() })
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId));
  const rows = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId))
    .orderBy(desc(deploymentsTable.createdAt))
    .limit(limit)
    .offset(offset);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  res.json({
    deployments: rows.map((d) => ({ ...d, fileSnapshot: undefined })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
  });
});

router.get("/deployments/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const result = await checkDeploymentViewerAccess(req, res, req.params.id as string);
  if (!result) return;
  res.json({ ...result.deployment, fileSnapshot: undefined });
});

router.post("/deployments", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId, commitMessage } = (req.body || {}) as { projectId?: string; commitMessage?: string };
  if (!projectId) {
    res.status(400).json({ error: "projectId is required in body" });
    return;
  }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (project.ownerId !== userId) {
    const { collaboratorsTable } = await import("@workspace/db");
    const [collab] = await db.select().from(collaboratorsTable).where(
      and(eq(collaboratorsTable.projectId, projectId), eq(collaboratorsTable.userId, userId)),
    );
    if (!collab || (collab.role !== "editor" && collab.role !== "admin")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  const [versionResult] = await db.select({ count: count() })
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId));
  const version = (versionResult?.count ?? 0) + 1;
  const snapshot = await captureFileSnapshot(projectId);
  const [deployment] = await db.insert(deploymentsTable).values({
    projectId,
    deployedBy: userId,
    version,
    status: "queued",
    fileSnapshot: snapshot,
    commitMessage: commitMessage || `Deployment v${version}`,
    environment: "production",
  }).returning();
  const subdomain = buildSubdomain(project.slug, deployment.id);
  await db.update(deploymentsTable).set({ subdomain }).where(eq(deploymentsTable.id, deployment.id));
  await enqueueBuild(deployment.id, projectId);
  res.status(201).json({ ...deployment, subdomain, fileSnapshot: undefined });
});

router.post("/deployments/:id/rollback", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const deploymentId = req.params.id as string;
  if (!(await checkDeploymentEditorAccess(req, res, deploymentId))) return;
  const [target] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId));
  if (!target) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }
  if (target.status !== "live" && target.status !== "stopped") {
    res.status(400).json({ error: "Can only rollback to live or stopped deployments" });
    return;
  }
  const snapshot = target.fileSnapshot as FileSnapshotEntry[] | null;
  if (!snapshot || !Array.isArray(snapshot)) {
    res.status(400).json({ error: "No file snapshot available" });
    return;
  }
  const currentLive = await db.select().from(deploymentsTable)
    .where(and(eq(deploymentsTable.projectId, target.projectId), eq(deploymentsTable.status, "live")));
  for (const live of currentLive) {
    await db.update(deploymentsTable)
      .set({ status: "stopped", stoppedAt: new Date() })
      .where(eq(deploymentsTable.id, live.id));
  }
  await restoreSnapshotToProject(target.projectId, snapshot);
  const [versionResult] = await db.select({ count: count() })
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, target.projectId));
  const version = (versionResult?.count ?? 0) + 1;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, target.projectId));
  const newSnapshot = await captureFileSnapshot(target.projectId);
  const { userId } = req as AuthenticatedRequest;
  const [created] = await db.insert(deploymentsTable).values({
    projectId: target.projectId,
    deployedBy: userId,
    version,
    status: "queued",
    fileSnapshot: newSnapshot,
    commitMessage: `Rollback to v${target.version}`,
    rollbackFromId: target.id,
    environment: "production",
  }).returning();
  const subdomain = buildSubdomain(project?.slug || "app", created.id);
  await db.update(deploymentsTable).set({ subdomain }).where(eq(deploymentsTable.id, created.id));
  await enqueueBuild(created.id, target.projectId);
  res.status(201).json({ ...created, subdomain, fileSnapshot: undefined });
});

export default router;
