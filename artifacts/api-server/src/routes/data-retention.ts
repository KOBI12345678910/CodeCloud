import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, dataRetentionPoliciesTable, orgMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";

const router = Router();

router.get("/organizations/:orgId/retention-policy", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params.orgId as string;

  const [membership] = await db.select()
    .from(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, user.id)));

  if (!membership) {
    res.status(403).json({ error: "Not a member of this organization" });
    return;
  }

  const [policy] = await db.select()
    .from(dataRetentionPoliciesTable)
    .where(eq(dataRetentionPoliciesTable.orgId, orgId));

  res.json(policy || {
    orgId,
    autoArchiveDays: null,
    autoDeleteDays: null,
    notifyBeforeDays: 7,
    enabled: false,
  });
});

router.put("/organizations/:orgId/retention-policy", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params.orgId as string;

  const [membership] = await db.select()
    .from(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, user.id)));

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    res.status(403).json({ error: "Only org owners and admins can manage retention policies" });
    return;
  }

  const { autoArchiveDays, autoDeleteDays, notifyBeforeDays, enabled } = req.body;

  if (autoArchiveDays !== undefined && autoArchiveDays !== null && (autoArchiveDays < 1 || autoArchiveDays > 3650)) {
    res.status(400).json({ error: "autoArchiveDays must be between 1 and 3650" });
    return;
  }
  if (autoDeleteDays !== undefined && autoDeleteDays !== null && (autoDeleteDays < 1 || autoDeleteDays > 3650)) {
    res.status(400).json({ error: "autoDeleteDays must be between 1 and 3650" });
    return;
  }
  if (autoArchiveDays && autoDeleteDays && autoDeleteDays <= autoArchiveDays) {
    res.status(400).json({ error: "autoDeleteDays must be greater than autoArchiveDays" });
    return;
  }

  const existing = await db.select()
    .from(dataRetentionPoliciesTable)
    .where(eq(dataRetentionPoliciesTable.orgId, orgId));

  let result;
  if (existing.length > 0) {
    [result] = await db.update(dataRetentionPoliciesTable)
      .set({
        autoArchiveDays: autoArchiveDays ?? null,
        autoDeleteDays: autoDeleteDays ?? null,
        notifyBeforeDays: notifyBeforeDays ?? 7,
        enabled: enabled ?? false,
      })
      .where(eq(dataRetentionPoliciesTable.orgId, orgId))
      .returning();
  } else {
    [result] = await db.insert(dataRetentionPoliciesTable).values({
      orgId,
      autoArchiveDays: autoArchiveDays ?? null,
      autoDeleteDays: autoDeleteDays ?? null,
      notifyBeforeDays: notifyBeforeDays ?? 7,
      enabled: enabled ?? false,
    }).returning();
  }

  await logAudit({
    userId: user.id,
    action: "org.update",
    resourceType: "organization",
    resourceId: orgId,
    metadata: { action: "retention_policy_update", autoArchiveDays, autoDeleteDays, enabled },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  res.json(result);
});

export default router;
