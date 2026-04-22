import { Router, type IRouter } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import type { AuthenticatedRequest } from "../types";
import { db, creditsLedgerTable } from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";

const router: IRouter = Router();

const PLAN_MONTHLY_CREDITS_MICRO: Record<string, number> = {
  free: 30_000_000,
  pro: 200_000_000,
  team: 500_000_000,
};

const MAX_ROLLOVER_MICRO: Record<string, number> = {
  free: 0,
  pro: 100_000_000,
  team: 300_000_000,
};

router.get("/credits/balance", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId, user } = req as AuthenticatedRequest;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalResult] = await db
    .select({
      totalCredits: sql<number>`COALESCE(SUM(CASE WHEN ${creditsLedgerTable.amountMicroUsd} > 0 THEN ${creditsLedgerTable.amountMicroUsd} ELSE 0 END), 0)`,
      totalDebits: sql<number>`COALESCE(SUM(CASE WHEN ${creditsLedgerTable.amountMicroUsd} < 0 THEN ABS(${creditsLedgerTable.amountMicroUsd}) ELSE 0 END), 0)`,
    })
    .from(creditsLedgerTable)
    .where(eq(creditsLedgerTable.userId, userId));

  const balance = (totalResult?.totalCredits ?? 0) - (totalResult?.totalDebits ?? 0);
  const plan = (user as any).plan || "free";
  const monthlyAllocation = PLAN_MONTHLY_CREDITS_MICRO[plan] || 30_000_000;
  const maxRollover = MAX_ROLLOVER_MICRO[plan] || 0;

  const [monthUsage] = await db
    .select({
      used: sql<number>`COALESCE(SUM(CASE WHEN ${creditsLedgerTable.amountMicroUsd} < 0 THEN ABS(${creditsLedgerTable.amountMicroUsd}) ELSE 0 END), 0)`,
    })
    .from(creditsLedgerTable)
    .where(
      and(
        eq(creditsLedgerTable.userId, userId),
        gte(creditsLedgerTable.createdAt, monthStart)
      )
    );

  const usedThisMonth = monthUsage?.used ?? 0;

  res.json({
    balanceMicroUsd: Math.max(0, balance),
    balanceUsd: Math.max(0, balance) / 1_000_000,
    usedThisMonthMicroUsd: usedThisMonth,
    usedThisMonthUsd: usedThisMonth / 1_000_000,
    monthlyAllocationMicroUsd: monthlyAllocation,
    monthlyAllocationUsd: monthlyAllocation / 1_000_000,
    maxRolloverMicroUsd: maxRollover,
    maxRolloverUsd: maxRollover / 1_000_000,
    plan,
    rolloverEnabled: plan !== "free",
    nextReset: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
  });
});

router.post("/credits/topup", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId, user } = req as AuthenticatedRequest;
  const { stripePaymentIntentId } = req.body;

  if (!stripePaymentIntentId || typeof stripePaymentIntentId !== "string") {
    res.status(400).json({ error: "A verified Stripe PaymentIntent ID is required for top-ups. Complete payment via /billing/topup-checkout first." });
    return;
  }

  const plan = (user as any).plan || "free";
  if (plan === "free") {
    res.status(403).json({ error: "Upgrade to Pro or Team for on-demand credit top-ups" });
    return;
  }

  const [existing] = await db
    .select()
    .from(creditsLedgerTable)
    .where(eq(creditsLedgerTable.stripeEventId, stripePaymentIntentId))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "This payment has already been processed" });
    return;
  }

  res.status(202).json({
    message: "Top-up request received. Credits will be applied once Stripe payment is confirmed via webhook.",
    stripePaymentIntentId,
  });
});

router.post("/credits/rollover", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId, user } = req as AuthenticatedRequest;
  const plan = (user as any).plan || "free";

  if (plan === "free") {
    res.status(403).json({ error: "Credit rollover is not available on the Free plan" });
    return;
  }

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [alreadyGranted] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(creditsLedgerTable)
    .where(
      and(
        eq(creditsLedgerTable.userId, userId),
        eq(creditsLedgerTable.kind, "subscription_grant"),
        gte(creditsLedgerTable.createdAt, monthStart)
      )
    );

  if ((alreadyGranted?.count ?? 0) > 0) {
    res.status(409).json({ error: `Monthly allocation for ${monthKey} has already been applied` });
    return;
  }

  const maxRollover = MAX_ROLLOVER_MICRO[plan] || 0;
  const monthlyAllocation = PLAN_MONTHLY_CREDITS_MICRO[plan] || 0;

  const [result] = await db
    .select({
      balance: sql<number>`COALESCE(SUM(${creditsLedgerTable.amountMicroUsd}), 0)`,
    })
    .from(creditsLedgerTable)
    .where(eq(creditsLedgerTable.userId, userId));

  const currentBalance = result?.balance ?? 0;
  const rolloverAmount = Math.min(Math.max(0, currentBalance), maxRollover);

  await db.insert(creditsLedgerTable).values({
    userId,
    kind: "subscription_grant",
    amountMicroUsd: monthlyAllocation,
    description: `Monthly allocation (${monthKey}): $${(monthlyAllocation / 1_000_000).toFixed(2)} + $${(rolloverAmount / 1_000_000).toFixed(2)} rolled over`,
  });

  res.json({
    monthlyAllocationUsd: monthlyAllocation / 1_000_000,
    rolledOverUsd: rolloverAmount / 1_000_000,
    newBalanceUsd: (currentBalance + monthlyAllocation) / 1_000_000,
    maxRolloverUsd: maxRollover / 1_000_000,
    month: monthKey,
  });
});

router.get("/credits/history", requireJwtAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

  const entries = await db
    .select()
    .from(creditsLedgerTable)
    .where(eq(creditsLedgerTable.userId, userId))
    .orderBy(sql`${creditsLedgerTable.createdAt} DESC`)
    .limit(limit);

  res.json({
    entries: entries.map((e) => ({
      ...e,
      amountUsd: e.amountMicroUsd / 1_000_000,
    })),
  });
});

export default router;
