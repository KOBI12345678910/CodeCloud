import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { randomBytes, createHash } from "crypto";
import { db, oauthAppsTable, oauthAuthorizationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";

const router = Router();

function generateClientId(): string {
  return "cc_" + randomBytes(24).toString("hex");
}

function generateClientSecret(): string {
  return "ccs_" + randomBytes(32).toString("hex");
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

const CreateOauthAppSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  redirectUris: z.array(z.string().url()).min(1).max(10),
  homepage: z.string().url().max(500).optional(),
});

const UpdateOauthAppSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  redirectUris: z.array(z.string().url()).min(1).max(10).optional(),
  homepage: z.string().url().max(500).optional(),
  isActive: z.boolean().optional(),
});

router.get("/oauth/apps", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;

  const apps = await db
    .select({
      id: oauthAppsTable.id,
      name: oauthAppsTable.name,
      description: oauthAppsTable.description,
      clientId: oauthAppsTable.clientId,
      clientSecretPrefix: oauthAppsTable.clientSecretPrefix,
      redirectUris: oauthAppsTable.redirectUris,
      homepage: oauthAppsTable.homepage,
      logoUrl: oauthAppsTable.logoUrl,
      isActive: oauthAppsTable.isActive,
      createdAt: oauthAppsTable.createdAt,
      updatedAt: oauthAppsTable.updatedAt,
    })
    .from(oauthAppsTable)
    .where(eq(oauthAppsTable.userId, userId))
    .orderBy(desc(oauthAppsTable.createdAt));

  const parsed = apps.map((app) => ({
    ...app,
    redirectUris: JSON.parse(app.redirectUris),
  }));

  res.json({ apps: parsed });
});

router.post("/oauth/apps", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;

  const body = CreateOauthAppSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const secretHash = hashSecret(clientSecret);
  const secretPrefix = clientSecret.slice(0, 10) + "...";

  const [app] = await db.insert(oauthAppsTable).values({
    userId,
    name: body.data.name,
    description: body.data.description || null,
    clientId,
    clientSecretHash: secretHash,
    clientSecretPrefix: secretPrefix,
    redirectUris: JSON.stringify(body.data.redirectUris),
    homepage: body.data.homepage || null,
  }).returning();

  logAudit({
    userId,
    action: "oauth_app.create",
    resourceType: "oauth_app",
    resourceId: app.id,
    metadata: { name: body.data.name },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.status(201).json({
    app: {
      id: app.id,
      name: app.name,
      description: app.description,
      clientId: app.clientId,
      clientSecretPrefix: app.clientSecretPrefix,
      redirectUris: body.data.redirectUris,
      homepage: app.homepage,
      isActive: app.isActive,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    },
    clientSecret,
  });
});

router.get("/oauth/apps/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const appId = req.params["id"] as string;

  const [app] = await db
    .select()
    .from(oauthAppsTable)
    .where(and(eq(oauthAppsTable.id, appId), eq(oauthAppsTable.userId, userId)));

  if (!app) {
    res.status(404).json({ error: "OAuth app not found" });
    return;
  }

  res.json({
    app: {
      ...app,
      redirectUris: JSON.parse(app.redirectUris),
      clientSecretHash: undefined,
    },
  });
});

router.patch("/oauth/apps/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const appId = req.params["id"] as string;

  const body = UpdateOauthAppSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(oauthAppsTable)
    .where(and(eq(oauthAppsTable.id, appId), eq(oauthAppsTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "OAuth app not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (body.data.name !== undefined) updates.name = body.data.name;
  if (body.data.description !== undefined) updates.description = body.data.description;
  if (body.data.redirectUris !== undefined) updates.redirectUris = JSON.stringify(body.data.redirectUris);
  if (body.data.homepage !== undefined) updates.homepage = body.data.homepage;
  if (body.data.isActive !== undefined) updates.isActive = body.data.isActive;

  const [updated] = await db
    .update(oauthAppsTable)
    .set(updates)
    .where(eq(oauthAppsTable.id, appId))
    .returning();

  logAudit({
    userId,
    action: "oauth_app.update",
    resourceType: "oauth_app",
    resourceId: appId,
    metadata: { changes: Object.keys(updates) },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({
    app: {
      ...updated,
      redirectUris: JSON.parse(updated.redirectUris),
      clientSecretHash: undefined,
    },
  });
});

router.post("/oauth/apps/:id/rotate-secret", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const appId = req.params["id"] as string;

  const [existing] = await db
    .select()
    .from(oauthAppsTable)
    .where(and(eq(oauthAppsTable.id, appId), eq(oauthAppsTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "OAuth app not found" });
    return;
  }

  const clientSecret = generateClientSecret();
  const secretHash = hashSecret(clientSecret);
  const secretPrefix = clientSecret.slice(0, 10) + "...";

  await db
    .update(oauthAppsTable)
    .set({ clientSecretHash: secretHash, clientSecretPrefix: secretPrefix })
    .where(eq(oauthAppsTable.id, appId));

  logAudit({
    userId,
    action: "oauth_app.secret_rotate",
    resourceType: "oauth_app",
    resourceId: appId,
    metadata: { name: existing.name },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ clientSecret });
});

router.delete("/oauth/apps/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const appId = req.params["id"] as string;

  const [existing] = await db
    .select()
    .from(oauthAppsTable)
    .where(and(eq(oauthAppsTable.id, appId), eq(oauthAppsTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "OAuth app not found" });
    return;
  }

  await db.delete(oauthAppsTable).where(eq(oauthAppsTable.id, appId));

  logAudit({
    userId,
    action: "oauth_app.delete",
    resourceType: "oauth_app",
    resourceId: appId,
    metadata: { name: existing.name },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ success: true });
});

router.get("/oauth/authorized", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;

  const authorizations = await db
    .select({
      id: oauthAuthorizationsTable.id,
      scopes: oauthAuthorizationsTable.scopes,
      isRevoked: oauthAuthorizationsTable.isRevoked,
      createdAt: oauthAuthorizationsTable.createdAt,
      revokedAt: oauthAuthorizationsTable.revokedAt,
      appId: oauthAppsTable.id,
      appName: oauthAppsTable.name,
      appDescription: oauthAppsTable.description,
      appHomepage: oauthAppsTable.homepage,
      appLogoUrl: oauthAppsTable.logoUrl,
    })
    .from(oauthAuthorizationsTable)
    .innerJoin(oauthAppsTable, eq(oauthAuthorizationsTable.appId, oauthAppsTable.id))
    .where(
      and(
        eq(oauthAuthorizationsTable.userId, userId),
        eq(oauthAuthorizationsTable.isRevoked, false)
      )
    )
    .orderBy(desc(oauthAuthorizationsTable.createdAt));

  res.json({ authorizations });
});

router.post("/oauth/authorized/:id/revoke", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const authId = req.params["id"] as string;

  const [auth] = await db
    .select()
    .from(oauthAuthorizationsTable)
    .where(and(eq(oauthAuthorizationsTable.id, authId), eq(oauthAuthorizationsTable.userId, userId)));

  if (!auth) {
    res.status(404).json({ error: "Authorization not found" });
    return;
  }

  await db
    .update(oauthAuthorizationsTable)
    .set({ isRevoked: true, revokedAt: new Date() })
    .where(eq(oauthAuthorizationsTable.id, authId));

  logAudit({
    userId,
    action: "oauth_auth.revoke",
    resourceType: "oauth_authorization",
    resourceId: authId,
    metadata: { appId: auth.appId },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ success: true });
});

export default router;
