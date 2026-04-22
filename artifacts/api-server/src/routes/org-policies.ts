import { Router, Request, Response } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import type { AuthenticatedRequest } from "../types";
import { getOrgPolicy, updateOrgPolicy } from "../services/org-policies";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";
import { db, orgMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function requireOrgAdmin(req: Request, res: Response, orgId: string): Promise<boolean> {
  const { userId } = req as AuthenticatedRequest;
  const [membership] = await db.select().from(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, userId)));
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    res.status(403).json({ error: "Org admin access required" });
    return false;
  }
  return true;
}

router.get("/organizations/:orgId/policies", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
  if (!(await requireOrgAdmin(req, res, orgId))) return;

  const policy = await getOrgPolicy(orgId);
  res.json(policy);
});

router.patch("/organizations/:orgId/policies", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
  if (!(await requireOrgAdmin(req, res, orgId))) return;

  const { userId } = req as AuthenticatedRequest;
  const allowedFields = [
    "require2fa", "defaultMemberRole", "projectVisibility",
    "apiAccessEnabled", "ipAllowlistEnabled", "sessionTimeoutMinutes",
    "allowedAuthMethods",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const updated = await updateOrgPolicy(orgId, updates);
  if (!updated) {
    res.status(500).json({ error: "Failed to update policies" });
    return;
  }

  logAudit({
    userId,
    action: "org.update",
    resourceType: "organization",
    resourceId: orgId,
    metadata: { action: "policies_updated", changes: Object.keys(updates) },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  res.json(updated);
});

export default router;
