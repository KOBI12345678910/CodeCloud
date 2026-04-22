import { Router, type IRouter } from "express";
import { db, deploymentsTable, deploymentRegionsTable, filesTable } from "@workspace/db";
import { eq, desc, count, and } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { getClientIp } from "../services/audit";
import {
  REGION_PRESETS,
  type RegionCode,
  resolveRouteForDeployment,
  runHealthChecksForDeployment,
  createRegionsForDeployment,
  markRegionsLive,
  getLatencyHistory,
  summarizeLatency,
} from "../services/deployment-region-routing";

const router: IRouter = Router();

const RegionCodeSchema = z.enum(["us-east", "eu-west", "ap-southeast"]);

const RegionDeploymentBody = z.object({
  regions: z.array(RegionCodeSchema).min(1),
  commitMessage: z.string().optional(),
});

interface FileSnapshotEntry { path: string; name: string; content: string | null; sizeBytes: number; hash: string; }

function simpleHash(content: string): string {
  let h = 0;
  for (let i = 0; i < content.length; i++) h = ((h << 5) - h + content.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

async function captureFileSnapshot(projectId: string): Promise<FileSnapshotEntry[]> {
  const files = await db.select().from(filesTable).where(eq(filesTable.projectId, projectId));
  return files.filter((f) => !f.isDirectory).map((f) => ({
    path: f.path, name: f.name, content: f.content, sizeBytes: f.sizeBytes, hash: simpleHash(f.content || ""),
  }));
}

router.get("/regions/presets", (_req, res) => {
  res.json(REGION_PRESETS);
});

router.get(
  "/projects/:id/deployments/:deploymentId/regions",
  requireAuth,
  requireProjectAccess("viewer"),
  async (req, res): Promise<void> => {
    const projectId = req.params.id as string;
    const deploymentId = req.params.deploymentId as string;
    const [deployment] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId));
    if (!deployment || deployment.projectId !== projectId) {
      res.status(404).json({ error: "Deployment not found" });
      return;
    }
    const rows = await db.select().from(deploymentRegionsTable)
      .where(eq(deploymentRegionsTable.deploymentId, deploymentId));
    const enriched = rows.map((r) => {
      const preset = REGION_PRESETS.find((p) => p.code === r.region);
      return { ...r, name: preset?.name, location: preset?.location };
    });
    res.json(enriched);
  },
);

router.post(
  "/projects/:id/deployments/regions",
  requireAuth,
  requireProjectAccess("editor"),
  async (req, res): Promise<void> => {
    const projectId = req.params.id as string;
    const parsed = RegionDeploymentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { userId } = req as AuthenticatedRequest;
    const regions = Array.from(new Set(parsed.data.regions)) as RegionCode[];

    const [versionResult] = await db.select({ count: count() })
      .from(deploymentsTable).where(eq(deploymentsTable.projectId, projectId));
    const version = (versionResult?.count ?? 0) + 1;
    const subdomain = `project-${projectId.slice(0, 8)}-v${version}`;

    const snapshot = await captureFileSnapshot(projectId);

    const [deployment] = await db.insert(deploymentsTable).values({
      projectId,
      deployedBy: userId,
      version,
      status: "building",
      subdomain,
      fileSnapshot: snapshot,
      commitMessage: parsed.data.commitMessage || `Multi-region deploy v${version}`,
      environment: "production",
    }).returning();

    await createRegionsForDeployment(deployment.id, regions);

    const startTime = Date.now();
    setTimeout(async () => {
      try {
        const duration = Date.now() - startTime;
        await db.update(deploymentsTable).set({
          status: "live",
          buildLog: `Multi-region build complete.\n> Deployed to: ${regions.join(", ")}\n> Health checks active.`,
          completedAt: new Date(),
          duration,
        }).where(eq(deploymentsTable.id, deployment.id));
        await markRegionsLive(deployment.id);
      } catch (_) {}
    }, 2000);

    const regionRows = await db.select().from(deploymentRegionsTable)
      .where(eq(deploymentRegionsTable.deploymentId, deployment.id));

    res.status(201).json({
      deployment: { ...deployment, fileSnapshot: undefined },
      regions: regionRows,
    });
  },
);

router.post(
  "/projects/:id/deployments/:deploymentId/regions/health-check",
  requireAuth,
  requireProjectAccess("editor"),
  async (req, res): Promise<void> => {
    const projectId = req.params.id as string;
    const deploymentId = req.params.deploymentId as string;
    const [deployment] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId));
    if (!deployment || deployment.projectId !== projectId) {
      res.status(404).json({ error: "Deployment not found" });
      return;
    }
    const updated = await runHealthChecksForDeployment(deploymentId);
    res.json(updated);
  },
);

router.get(
  "/projects/:id/deployments/:deploymentId/regions/route",
  requireAuth,
  requireProjectAccess("viewer"),
  async (req, res): Promise<void> => {
    const projectId = req.params.id as string;
    const deploymentId = req.params.deploymentId as string;
    const [deployment] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId));
    if (!deployment || deployment.projectId !== projectId) {
      res.status(404).json({ error: "Deployment not found" });
      return;
    }
    const ipParam = (req.query.ip as string | undefined) || getClientIp(req) || "127.0.0.1";
    const route = await resolveRouteForDeployment(deploymentId, ipParam);
    res.json(route);
  },
);

router.get(
  "/projects/:id/deployments/:deploymentId/regions/latency-stats",
  requireAuth,
  requireProjectAccess("viewer"),
  async (req, res): Promise<void> => {
    const projectId = req.params.id as string;
    const deploymentId = req.params.deploymentId as string;
    const [deployment] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId));
    if (!deployment || deployment.projectId !== projectId) {
      res.status(404).json({ error: "Deployment not found" });
      return;
    }
    const rows = await db.select().from(deploymentRegionsTable)
      .where(eq(deploymentRegionsTable.deploymentId, deploymentId));
    const stats = rows.map((r) => {
      const samples = getLatencyHistory(r.id);
      const preset = REGION_PRESETS.find((p) => p.code === r.region);
      return {
        regionRowId: r.id,
        region: r.region,
        name: preset?.name,
        currentLatencyMs: r.latencyMs,
        health: r.health,
        status: r.status,
        consecutiveFailures: r.consecutiveFailures,
        lastHealthCheckAt: r.lastHealthCheckAt,
        lastHealthyAt: r.lastHealthyAt,
        summary: summarizeLatency(samples),
        history: samples,
      };
    });
    res.json(stats);
  },
);

// Public visitor routing endpoint — no auth required. This is what real
// deployment traffic hits to get auto-routed to the nearest healthy region.
router.get("/r/:subdomain", async (req, res): Promise<void> => {
  const subdomain = req.params.subdomain as string;
  const [deployment] = await db.select().from(deploymentsTable)
    .where(eq(deploymentsTable.subdomain, subdomain));
  if (!deployment || deployment.status !== "live") {
    res.status(404).json({ error: "Deployment not found or not live" });
    return;
  }
  // Allow ?ip= override only outside production for testing/simulation.
  const allowOverride = process.env.NODE_ENV !== "production";
  const overrideIp = allowOverride ? (req.query.ip as string | undefined) : undefined;
  const ip = overrideIp || getClientIp(req) || req.ip || "127.0.0.1";
  const route = await resolveRouteForDeployment(deployment.id, ip);
  if (!route.region || !route.endpoint) {
    res.status(503).json({ error: "No healthy region available", reason: route.reason, ip });
    return;
  }
  // Forward via redirect; visitors land on the geo-nearest healthy region.
  res.setHeader("X-Geo-Region", route.region);
  res.setHeader("X-Geo-Country", route.clientCountry || "");
  if (req.query.json === "1") {
    res.json(route);
    return;
  }
  res.redirect(302, route.endpoint);
});

router.get(
  "/projects/:id/deployments/regions/latest",
  requireAuth,
  requireProjectAccess("viewer"),
  async (req, res): Promise<void> => {
    const projectId = req.params.id as string;
    const [latest] = await db.select().from(deploymentsTable)
      .where(and(eq(deploymentsTable.projectId, projectId), eq(deploymentsTable.environment, "production")))
      .orderBy(desc(deploymentsTable.createdAt)).limit(1);
    if (!latest) { res.json({ deployment: null, regions: [] }); return; }
    const rows = await db.select().from(deploymentRegionsTable)
      .where(eq(deploymentRegionsTable.deploymentId, latest.id));
    const enriched = rows.map((r) => {
      const preset = REGION_PRESETS.find((p) => p.code === r.region);
      return { ...r, name: preset?.name, location: preset?.location };
    });
    res.json({ deployment: { ...latest, fileSnapshot: undefined }, regions: enriched });
  },
);

export default router;
