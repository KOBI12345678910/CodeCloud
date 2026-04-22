import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, organizationsTable, orgMembersTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";

const router = Router();
const VALID_REGIONS = ["us", "eu", "apac"];

router.get("/organizations/:orgId/data-region", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params.orgId as string;

  const [membership] = await db.select()
    .from(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, user.id)));

  if (!membership) {
    res.status(403).json({ error: "Not a member of this organization" });
    return;
  }

  const [org] = await db.select({
    id: organizationsTable.id,
    name: organizationsTable.name,
    dataRegion: organizationsTable.dataRegion,
  }).from(organizationsTable).where(eq(organizationsTable.id, orgId));

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  res.json({ orgId: org.id, name: org.name, dataRegion: org.dataRegion });
});

router.patch("/organizations/:orgId/data-region", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params.orgId as string;
  const { dataRegion } = req.body;

  if (!dataRegion || !VALID_REGIONS.includes(dataRegion)) {
    res.status(400).json({ error: "dataRegion must be one of: us, eu, apac" });
    return;
  }

  const [membership] = await db.select()
    .from(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, user.id)));

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    res.status(403).json({ error: "Only org owners and admins can change data region" });
    return;
  }

  const [updated] = await db.update(organizationsTable)
    .set({ dataRegion })
    .where(eq(organizationsTable.id, orgId))
    .returning();

  await logAudit({
    userId: user.id,
    action: "org.update",
    resourceType: "organization",
    resourceId: orgId,
    metadata: { dataRegion, action: "data_region_change" },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  res.json({ orgId: updated.id, dataRegion: updated.dataRegion });
});

router.get("/organizations/:orgId/data-region/validate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;

  const [org] = await db.select({
    id: organizationsTable.id,
    dataRegion: organizationsTable.dataRegion,
  }).from(organizationsTable).where(eq(organizationsTable.id, orgId));

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  res.json({
    orgId: org.id,
    dataRegion: org.dataRegion,
    enforcedRegion: org.dataRegion,
    message: `All new projects in this organization will be created in the ${org.dataRegion.toUpperCase()} region`,
  });
});

router.get("/compliance/data-residency-stats", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const orgs = await db.select({
    dataRegion: organizationsTable.dataRegion,
    count: count(),
  }).from(organizationsTable).groupBy(organizationsTable.dataRegion);

  const distribution: Record<string, number> = { us: 0, eu: 0, apac: 0 };
  for (const row of orgs) {
    distribution[row.dataRegion] = row.count;
  }

  res.json({ distribution });
});

export default router;
