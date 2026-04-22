import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, dsarRequestsTable, auditLogTable, organizationsTable, userConsentsTable } from "@workspace/db";
import { count, gte, eq, desc, and, sql } from "drizzle-orm";
import { getDsarStats } from "../services/gdpr-compliance";

const router = Router();

router.get("/admin/compliance", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  try {
    const dsarStats = await getDsarStats();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const auditStats = await db.select({ count: count() })
      .from(auditLogTable)
      .where(gte(auditLogTable.createdAt, thirtyDaysAgo));

    const regionDistribution = await db.select({
      dataRegion: organizationsTable.dataRegion,
      count: count(),
    }).from(organizationsTable).groupBy(organizationsTable.dataRegion);

    const consentStats = await db.select({
      category: userConsentsTable.category,
      granted: userConsentsTable.granted,
      count: count(),
    }).from(userConsentsTable).groupBy(userConsentsTable.category, userConsentsTable.granted);

    const consentRates: Record<string, { granted: number; denied: number }> = {};
    for (const row of consentStats) {
      if (!consentRates[row.category]) {
        consentRates[row.category] = { granted: 0, denied: 0 };
      }
      if (row.granted) {
        consentRates[row.category].granted = row.count;
      } else {
        consentRates[row.category].denied = row.count;
      }
    }

    const pendingDeletions = await db.select()
      .from(dsarRequestsTable)
      .where(
        and(
          eq(dsarRequestsTable.type, "deletion"),
          eq(dsarRequestsTable.status, "pending")
        )
      )
      .orderBy(desc(dsarRequestsTable.createdAt));

    const regions: Record<string, number> = { us: 0, eu: 0, apac: 0 };
    for (const r of regionDistribution) {
      regions[r.dataRegion] = r.count;
    }

    res.json({
      dsarRequests: dsarStats,
      auditLogStats: {
        last30Days: auditStats[0]?.count || 0,
      },
      dataResidency: {
        distribution: regions,
      },
      consentRates,
      deletionQueue: pendingDeletions,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load compliance dashboard", detail: err.message });
  }
});

router.get("/admin/compliance/audit-export", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const days = parseInt(req.query.days as string) || 30;
  const since = new Date(Date.now() - days * 86400000);

  const logs = await db.select()
    .from(auditLogTable)
    .where(gte(auditLogTable.createdAt, since))
    .orderBy(desc(auditLogTable.createdAt))
    .limit(10000);

  const format = req.query.format as string;
  if (format === "csv") {
    const header = "id,userId,action,resourceType,resourceId,ipAddress,createdAt\n";
    const rows = logs.map(l =>
      `${l.id},${l.userId || ""},${l.action},${l.resourceType},${l.resourceId || ""},${l.ipAddress || ""},${l.createdAt.toISOString()}`
    ).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="audit-log-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(header + rows);
  } else {
    res.json(logs);
  }
});

export default router;
