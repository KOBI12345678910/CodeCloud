import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { db, subscriptionsTable, usersTable } from "@workspace/db";
import { eq, and, isNotNull, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

export interface PlanDef {
  id: "free" | "pro" | "team";
  name: string;
  priceUsd: number;
  description: string;
  includedCreditsUsd: number;
  features: string[];
}

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    priceUsd: 0,
    description: "For individuals learning and experimenting.",
    includedCreditsUsd: 0,
    features: [
      "1 active project",
      "512 MB storage",
      "Shared compute",
      "5 deployments / month",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceUsd: 20,
    description: "For professionals shipping production apps.",
    includedCreditsUsd: 10,
    features: [
      "Unlimited projects",
      "2 GB storage",
      "2 vCPU / 4 GB compute",
      "Unlimited deployments",
      "$10 of AI credits included monthly",
      "Custom domains, private projects",
      "Priority email support",
    ],
  },
  {
    id: "team",
    name: "Team",
    priceUsd: 40,
    description: "For teams building together at scale.",
    includedCreditsUsd: 25,
    features: [
      "Everything in Pro",
      "5 GB storage",
      "4 vCPU / 8 GB compute",
      "Unlimited collaborators",
      "$25 of AI credits included monthly",
      "Audit logs",
      "Priority chat support",
    ],
  },
];

const PRICE_ID_BY_PLAN: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  team: process.env.STRIPE_PRICE_TEAM,
};

function getStripeOrNull() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return import("stripe").then((m) => new m.default(key));
}

router.get("/billing/plans", async (_req, res): Promise<void> => {
  res.json({
    plans: PLANS.map((p) => ({
      ...p,
      stripeConfigured: p.id === "free" ? true : Boolean(PRICE_ID_BY_PLAN[p.id]),
    })),
  });
});

router.get("/billing/subscription", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);

  const [user] = await db.select({ plan: usersTable.plan }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  res.json({
    plan: user?.plan ?? "free",
    subscription: sub
      ? {
          id: sub.id,
          status: sub.status,
          planId: sub.planId,
          stripeCustomerId: sub.stripeCustomerId,
          stripeSubscriptionId: sub.stripeSubscriptionId,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
  });
});

async function getOrCreateStripeCustomer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stripe: any,
  userId: string,
): Promise<string> {
  const [existing] = await db
    .select({ stripeCustomerId: subscriptionsTable.stripeCustomerId })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, userId), isNotNull(subscriptionsTable.stripeCustomerId)))
    .limit(1);

  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const [user] = await db
    .select({ email: usersTable.email, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const customer = await stripe.customers.create({
    email: user?.email ?? undefined,
    name: user?.username ?? undefined,
    metadata: { userId },
  });
  return customer.id as string;
}

router.post("/billing/subscribe", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const planId = String(req.body?.plan ?? "").toLowerCase();
  if (!["pro", "team"].includes(planId)) {
    res.status(400).json({ error: "Plan must be 'pro' or 'team'." });
    return;
  }

  const priceId = PRICE_ID_BY_PLAN[planId];
  if (!priceId) {
    res
      .status(503)
      .json({ error: `Stripe price for plan '${planId}' is not configured. Set STRIPE_PRICE_${planId.toUpperCase()}.` });
    return;
  }

  const stripe = await getStripeOrNull();
  if (!stripe) {
    res.status(503).json({ error: "Stripe is not configured on this server." });
    return;
  }

  try {
    const customerId = await getOrCreateStripeCustomer(stripe, userId);
    const appUrl = process.env.APP_URL || "";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?stripe=cancelled`,
      client_reference_id: userId,
      metadata: { userId, planId },
      subscription_data: { metadata: { userId, planId } },
      allow_promotion_codes: true,
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id, planId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe subscription checkout failed";
    logger.error({ err: msg, userId, planId }, "subscribe failed");
    res.status(502).json({ error: msg });
  }
});

router.post("/billing/portal", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const stripe = await getStripeOrNull();
  if (!stripe) {
    res.status(503).json({ error: "Stripe is not configured on this server." });
    return;
  }

  const [sub] = await db
    .select({ stripeCustomerId: subscriptionsTable.stripeCustomerId })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);

  if (!sub?.stripeCustomerId) {
    res.status(404).json({ error: "No Stripe customer found. Subscribe to a plan first." });
    return;
  }

  try {
    const appUrl = process.env.APP_URL || "";
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    });
    res.json({ url: portal.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe billing portal failed";
    logger.error({ err: msg, userId }, "portal failed");
    res.status(502).json({ error: msg });
  }
});

export default router;
