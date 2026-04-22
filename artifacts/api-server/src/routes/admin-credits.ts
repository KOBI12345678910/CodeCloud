import { Router, type IRouter } from "express";
import { db, usersTable, agentTasksTable, adminAuditTable, pricingVersionsTable, subscriptionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { isAdmin, appendLedger, getBalanceMicroUsd } from "../services/credits/ledger";
import { cancelTask } from "../services/agent/runner";
import { invalidatePricingCache, DEFAULT_PRICE_TABLE } from "../services/credits/pricing-engine";

const router: IRouter = Router();

async function audit(adminUserId: string, action: string, targetUserId: string | null, payload: Record<string, unknown>) {
  await db.insert(adminAuditTable).values({ adminUserId, action, targetUserId, payload });
}

router.post("/admin/credits/grant", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin only" }); return; }
  const { targetUserId, amountUsd, reason } = req.body ?? {};
  if (!targetUserId || typeof amountUsd !== "number") { res.status(400).json({ error: "targetUserId, amountUsd required" }); return; }
  const out = await appendLedger({
    userId: targetUserId, kind: "admin_grant", amountMicroUsd: Math.round(amountUsd * 1_000_000),
    description: reason || "Admin credit grant", metadata: { adminUserId: userId },
  });
  await audit(userId, "credits.grant", targetUserId, { amountUsd, reason });
  res.json({ ok: true, balanceMicroUsd: out.balanceAfterMicroUsd });
});

router.post("/admin/credits/refund", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin only" }); return; }
  const { targetUserId, amountUsd, taskId, reason } = req.body ?? {};
  if (!targetUserId || typeof amountUsd !== "number") { res.status(400).json({ error: "targetUserId, amountUsd required" }); return; }
  const out = await appendLedger({
    userId: targetUserId, kind: "task_refund", amountMicroUsd: Math.round(amountUsd * 1_000_000),
    taskId: taskId ?? null, description: reason || "Admin manual refund", metadata: { adminUserId: userId },
  });
  await audit(userId, "credits.refund", targetUserId, { amountUsd, taskId, reason });
  res.json({ ok: true, balanceMicroUsd: out.balanceAfterMicroUsd });
});

router.put("/admin/users/:id/tier", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin only" }); return; }
  const targetUserId = String(req.params.id);
  const { tier } = req.body ?? {};
  if (!["free", "pro", "team", "enterprise"].includes(tier)) { res.status(400).json({ error: "Invalid tier" }); return; }
  if (tier === "enterprise") {
    // Enterprise tier is stored as an active subscription row because the
    // users.plan enum only covers free/pro/team. We keep the base plan as
    // 'team' so tier-aware code that ignores subscriptions still grants
    // the highest enum-supported entitlements.
    await db.update(usersTable).set({ plan: "team" }).where(eq(usersTable.id, targetUserId));
    await db.insert(subscriptionsTable).values({
      userId: targetUserId, planId: "enterprise", status: "active",
    }).onConflictDoNothing();
  } else {
    await db.update(usersTable).set({ plan: tier as "free" | "pro" | "team" }).where(eq(usersTable.id, targetUserId));
    // Cancel any active enterprise subscription rows so getUserTier no longer
    // resolves to enterprise after the downgrade.
    await db.update(subscriptionsTable)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(and(
        eq(subscriptionsTable.userId, targetUserId),
        eq(subscriptionsTable.planId, "enterprise"),
      ));
  }
  await audit(userId, "user.tier_change", targetUserId, { tier });
  res.json({ ok: true, tier });
});

router.post("/admin/tasks/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin only" }); return; }
  const id = String(req.params.id);
  const [task] = await db.select().from(agentTasksTable).where(eq(agentTasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  cancelTask(id);
  await db.update(agentTasksTable).set({ state: "cancelled", errorMessage: "Cancelled by admin", completedAt: new Date() }).where(eq(agentTasksTable.id, id));
  await audit(userId, "task.force_cancel", task.userId, { taskId: id });
  res.json({ ok: true });
});

router.get("/admin/pricing/versions", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin only" }); return; }
  const rows = await db.select().from(pricingVersionsTable).orderBy(desc(pricingVersionsTable.version));
  res.json(rows);
});

router.post("/admin/pricing/versions", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin only" }); return; }
  const { prices, marginBps, notes } = req.body ?? {};
  const [latest] = await db.select().from(pricingVersionsTable).orderBy(desc(pricingVersionsTable.version)).limit(1);
  const nextVersion = (latest?.version ?? 0) + 1;
  const [row] = await db.insert(pricingVersionsTable).values({
    version: nextVersion, prices: (prices ?? DEFAULT_PRICE_TABLE) as object,
    marginBps: marginBps ?? DEFAULT_PRICE_TABLE.marginBps, notes: notes ?? null,
    activatedAt: new Date(),
  }).returning();
  invalidatePricingCache();
  await audit(userId, "pricing.publish", null, { version: nextVersion });
  res.status(201).json(row);
});

router.get("/admin/users/search", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin only" }); return; }
  const q = String(req.query.q ?? "").trim();
  if (!q) { res.json([]); return; }
  const rows = await db.select({ id: usersTable.id, email: usersTable.email, username: usersTable.username, plan: usersTable.plan }).from(usersTable).limit(20);
  const filtered = rows.filter((u) => u.email.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase()));
  const withBalances = await Promise.all(filtered.map(async (u) => ({ ...u, balanceUsd: (await getBalanceMicroUsd(u.id)) / 1_000_000 })));
  res.json(withBalances);
});

export default router;
