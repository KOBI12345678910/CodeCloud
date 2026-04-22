import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, dsarRequestsTable, userConsentsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  requestDataExport,
  requestAccountDeletion,
  cancelDeletion,
  getUserDsarRequests,
  getExportData,
} from "../services/gdpr-compliance";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";

const router = Router();

router.get("/privacy/requests", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const requests = await getUserDsarRequests(user.id);
  res.json(requests);
});

router.post("/privacy/export", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const result = await requestDataExport(user.id);

  if ("error" in result) {
    res.status(429).json({ error: result.error });
    return;
  }

  await logAudit({
    userId: user.id,
    action: "user.profile_update",
    resourceType: "user",
    resourceId: user.id,
    metadata: { dsarType: "export", requestId: result.id },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  res.status(201).json(result);
});

router.get("/privacy/exports/:id/download", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const requestId = req.params.id as string;

  const data = await getExportData(requestId, user.id);
  if (!data) {
    res.status(404).json({ error: "Export not found or not ready" });
    return;
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="codecloud-data-export-${new Date().toISOString().split("T")[0]}.json"`);
  res.json(data);
});

router.post("/privacy/deletion", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { reason } = req.body || {};

  const result = await requestAccountDeletion(user.id, reason);

  await logAudit({
    userId: user.id,
    action: "user.profile_update",
    resourceType: "user",
    resourceId: user.id,
    metadata: { dsarType: "deletion", requestId: result.id },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  res.status(201).json({
    id: result.id,
    scheduledPurgeAt: result.scheduledPurgeAt,
    message: "Account deletion scheduled. You have 30 days to cancel this request.",
  });
});

router.post("/privacy/deletion/:id/cancel", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const requestId = req.params.id as string;

  const cancelled = await cancelDeletion(requestId, user.id);
  if (!cancelled) {
    res.status(404).json({ error: "Deletion request not found or cannot be cancelled" });
    return;
  }

  res.json({ message: "Deletion request cancelled successfully" });
});

router.get("/consents", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const consents = await db.select()
    .from(userConsentsTable)
    .where(eq(userConsentsTable.userId, user.id))
    .orderBy(desc(userConsentsTable.createdAt));

  const latest: Record<string, boolean> = {};
  for (const consent of consents) {
    if (!(consent.category in latest)) {
      latest[consent.category] = consent.granted;
    }
  }

  res.json({ consents: latest, history: consents });
});

router.post("/consents", async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { consents } = req.body;

  if (!consents || typeof consents !== "object") {
    res.status(400).json({ error: "consents object is required with category: boolean pairs" });
    return;
  }

  const dnt = req.headers["dnt"] === "1";
  const records = [];

  for (const [category, granted] of Object.entries(consents)) {
    if (!["necessary", "analytics", "marketing"].includes(category)) continue;

    let effectiveGrant = granted as boolean;
    if (dnt && category !== "necessary") {
      effectiveGrant = false;
    }

    records.push({
      userId: user?.id || null,
      sessionId: req.headers["x-session-id"] as string || null,
      category: category as "necessary" | "analytics" | "marketing",
      granted: effectiveGrant,
      version: "1.0",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  }

  if (records.length > 0) {
    await db.insert(userConsentsTable).values(records);
  }

  res.json({ saved: records.length, dntRespected: dnt });
});

router.get("/privacy/profile", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const [profile] = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    username: usersTable.username,
    displayName: usersTable.displayName,
    bio: usersTable.bio,
    avatarUrl: usersTable.avatarUrl,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, user.id));

  res.json(profile);
});

router.patch("/privacy/profile", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { displayName, username, bio } = req.body;
  const updates: Record<string, string> = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (username !== undefined) updates.username = username;
  if (bio !== undefined) updates.bio = bio;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db.update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, user.id))
    .returning();

  await logAudit({
    userId: user.id,
    action: "user.profile_update",
    resourceType: "user",
    resourceId: user.id,
    metadata: { fields: Object.keys(updates), rectification: true },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  res.json({ message: "Profile updated (right to rectification)", updated: Object.keys(updates) });
});

export default router;
