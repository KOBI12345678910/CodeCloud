import { Router, Request, Response } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import type { AuthenticatedRequest } from "../types";
import {
  addIPRule,
  checkIP,
  listIPRules,
  toggleIPRule,
  deleteIPRule,
} from "../services/ip-filtering";
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

router.get("/ip-filtering/:orgId", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
  if (!(await requireOrgAdmin(req, res, orgId))) return;
  const rules = await listIPRules(orgId);
  res.json(rules);
});

router.post("/ip-filtering", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { orgId, type, cidr, description } = req.body;
  if (!orgId || !type || !cidr) {
    res.status(400).json({ error: "orgId, type, and cidr are required" });
    return;
  }
  if (!(await requireOrgAdmin(req, res, orgId))) return;

  const { userId } = req as AuthenticatedRequest;
  const rule = await addIPRule({ orgId, type, cidr, description, createdBy: userId });

  logAudit({
    userId,
    action: "settings.update",
    resourceType: "organization",
    resourceId: orgId,
    metadata: { action: "ip_rule_added", cidr, type },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  res.status(201).json(rule);
});

router.post("/ip-filtering/check", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { orgId, ip } = req.body;
  const result = await checkIP(orgId, ip);
  res.json(result);
});

router.post("/ip-filtering/:id/toggle", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { ipAllowlistTable } = await import("@workspace/db");
  const [rule] = await db.select().from(ipAllowlistTable).where(eq(ipAllowlistTable.id, req.params.id as string));
  if (!rule) { res.status(404).json({ error: "Not found" }); return; }
  if (!(await requireOrgAdmin(req, res, rule.orgId))) return;

  const updated = await toggleIPRule(req.params.id as string);
  updated ? res.json(updated) : res.status(404).json({ error: "Not found" });
});

router.delete("/ip-filtering/:id", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { ipAllowlistTable } = await import("@workspace/db");
  const [rule] = await db.select().from(ipAllowlistTable).where(eq(ipAllowlistTable.id, req.params.id as string));
  if (!rule) { res.status(404).json({ error: "Not found" }); return; }
  if (!(await requireOrgAdmin(req, res, rule.orgId))) return;

  const deleted = await deleteIPRule(req.params.id as string);
  deleted ? res.json({ success: true }) : res.status(404).json({ error: "Not found" });
});

export default router;
