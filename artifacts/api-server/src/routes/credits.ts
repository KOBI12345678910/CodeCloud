import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { getBalanceMicroUsd, listLedger, getAutoTopup, upsertAutoTopup, appendLedger, getMonthlyBurn } from "../services/credits/ledger";
import { getEntitlements, TIER_ENTITLEMENTS } from "../services/credits/entitlements";

const router: IRouter = Router();

router.get("/credits/balance", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const [balance, ent, autoTopup, burn] = await Promise.all([
    getBalanceMicroUsd(userId), getEntitlements(userId), getAutoTopup(userId), getMonthlyBurn(userId, 6),
  ]);
  res.json({
    balanceMicroUsd: balance,
    balanceUsd: balance / 1_000_000,
    tier: ent.tier,
    entitlements: ent.entitlements,
    autoTopup: autoTopup ?? null,
    monthlyBurn: burn.map((b) => ({ month: b.month, debitedUsd: b.debitedMicroUsd / 1_000_000, refundedUsd: b.refundedMicroUsd / 1_000_000 })),
    lowBalance: autoTopup ? balance < Number(autoTopup.lowBalanceWarnMicroUsd) : balance < 5_000_000,
  });
});

router.get("/credits/ledger", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
  const cursor = (req.query.cursor as string | undefined) || undefined;
  const rows = await listLedger(userId, limit, cursor);
  res.json({
    entries: rows.map((r) => ({
      id: r.id, kind: r.kind, amountMicroUsd: Number(r.amountMicroUsd), amountUsd: Number(r.amountMicroUsd) / 1_000_000,
      taskId: r.taskId, invoiceId: r.invoiceId, description: r.description, createdAt: r.createdAt,
    })),
    nextCursor: rows.length === limit ? rows[rows.length - 1].id : null,
  });
});

router.get("/credits/auto-topup", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const row = await getAutoTopup(userId);
  res.json(row ?? { userId, enabled: 0, thresholdMicroUsd: 2_000_000, topupAmountMicroUsd: 20_000_000, lowBalanceWarnMicroUsd: 5_000_000 });
});

router.put("/credits/auto-topup", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { enabled, thresholdUsd, topupAmountUsd, lowBalanceWarnUsd, stripePaymentMethodId } = req.body ?? {};
  const patch: Partial<{ enabled: number; thresholdMicroUsd: number; topupAmountMicroUsd: number; lowBalanceWarnMicroUsd: number; stripePaymentMethodId: string }> = {};
  if (typeof enabled === "boolean") patch.enabled = enabled ? 1 : 0;
  if (typeof thresholdUsd === "number") patch.thresholdMicroUsd = Math.round(thresholdUsd * 1_000_000);
  if (typeof topupAmountUsd === "number") patch.topupAmountMicroUsd = Math.round(topupAmountUsd * 1_000_000);
  if (typeof lowBalanceWarnUsd === "number") patch.lowBalanceWarnMicroUsd = Math.round(lowBalanceWarnUsd * 1_000_000);
  if (typeof stripePaymentMethodId === "string") patch.stripePaymentMethodId = stripePaymentMethodId;
  const row = await upsertAutoTopup(userId, patch);
  res.json(row);
});

router.post("/credits/checkout", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const amountUsd = Math.max(5, Math.min(2000, Number(req.body?.amountUsd ?? 20)));
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);
    const appUrl = process.env.APP_URL || "";
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: `Credits top-up ($${amountUsd.toFixed(2)})` },
            unit_amount: Math.round(amountUsd * 100),
          },
          quantity: 1,
        }],
        success_url: `${appUrl}/billing?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/billing?stripe=cancelled`,
        metadata: { userId, kind: "topup" },
        client_reference_id: userId,
      });
      res.json({ checkoutUrl: session.url, sessionId: session.id, provider: "stripe", amountUsd });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe checkout failed";
      res.status(502).json({ error: msg });
      return;
    }
  }
  // No Stripe configured. Hard-fail in production to prevent free credits
  // from being minted by anyone hitting this endpoint without payment.
  // Only mint test credits when explicitly running in development AND a
  // dedicated test flag is set, so a misconfigured prod deploy cannot grant
  // free credits silently.
  const inDev = process.env.NODE_ENV !== "production";
  const allowTestMint = inDev && process.env.CREDITS_ALLOW_TEST_MINT === "1";
  if (!allowTestMint) {
    res.status(503).json({
      error: "Stripe is not configured on this server. Set STRIPE_SECRET_KEY to enable top-ups.",
      code: "stripe_unconfigured",
    });
    return;
  }
  const microUsd = Math.round(amountUsd * 1_000_000);
  const out = await appendLedger({
    userId, kind: "topup", amountMicroUsd: microUsd,
    description: `Test top-up $${amountUsd.toFixed(2)} (dev only)`,
    metadata: { provider: "test" },
  });
  res.json({ ok: true, balanceMicroUsd: out.balanceAfterMicroUsd, balanceUsd: out.balanceAfterMicroUsd / 1_000_000, provider: "test", amountUsd });
});

export default router;
