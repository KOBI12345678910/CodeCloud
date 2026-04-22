import { db, billingEventsTable, usersTable, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { appendLedger } from "./ledger";
import { createInvoice } from "./invoices";
import { logger } from "../../lib/logger";

export interface StripeEvent {
  id: string;
  type: string;
  data?: { object?: Record<string, unknown> };
  [k: string]: unknown;
}

async function findUserByStripeId(customerId: string | undefined, metadataUserId: string | undefined): Promise<string | null> {
  if (metadataUserId) {
    const [u] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, metadataUserId)).limit(1);
    if (u) return u.id;
  }
  if (customerId) {
    const [s] = await db.select({ userId: subscriptionsTable.userId }).from(subscriptionsTable).where(eq(subscriptionsTable.stripeCustomerId, customerId)).limit(1);
    if (s) return s.userId;
  }
  return null;
}

export async function handleStripeEvent(event: StripeEvent): Promise<{ ok: boolean; deduped?: boolean; error?: string }> {
  if (!event?.id || !event?.type) return { ok: false, error: "Invalid event" };

  // Atomically claim the event for processing. We INSERT-ON-CONFLICT and only
  // proceed when this delivery actually inserted the row. If a parallel
  // delivery already inserted it, we either return deduped (already
  // processed) or back off so Stripe retries (in-flight on another worker).
  const inserted = await db.insert(billingEventsTable).values({
    stripeEventId: event.id, type: event.type, payload: event as unknown as object,
  }).onConflictDoNothing().returning({ id: billingEventsTable.id });

  if (inserted.length === 0) {
    const [existing] = await db.select({ processedAt: billingEventsTable.processedAt })
      .from(billingEventsTable).where(eq(billingEventsTable.stripeEventId, event.id)).limit(1);
    if (existing?.processedAt) return { ok: true, deduped: true };
    // Row exists but was never marked processed. Either another worker is
    // still in flight, or a previous worker crashed before finishing. We
    // must NOT ack: return ok=false with a retryable error so the route
    // surfaces a non-2xx and Stripe retries the delivery later.
    return { ok: false, error: "in_flight_or_stuck" };
  }

  try {
    const obj = event.data?.object ?? {};
    const customerId = (obj.customer ?? obj.customerId) as string | undefined;
    const metaUserId = (obj.metadata?.userId ?? obj.metadata?.user_id) as string | undefined;

    switch (event.type) {
      case "checkout.session.completed": {
        const userId = await findUserByStripeId(customerId, metaUserId);
        if (!userId) break;
        const amountTotalCents = Number(obj.amount_total ?? obj.amountTotal ?? 0);
        const purchaseMicroUsd = amountTotalCents * 10_000;
        if (purchaseMicroUsd > 0) {
          await appendLedger({
            userId, kind: "topup", amountMicroUsd: purchaseMicroUsd,
            stripeEventId: event.id, description: "Stripe checkout top-up",
            metadata: { sessionId: obj.id, currency: obj.currency },
          });
          await createInvoice({
            userId, description: "Credit top-up", status: "paid",
            stripeInvoiceId: (obj.invoice as string) ?? null,
            stripeEventId: event.id,
            lineItems: [{ description: "Credits", quantity: 1, unitMicroUsd: purchaseMicroUsd, amountMicroUsd: purchaseMicroUsd }],
          });
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const userId = await findUserByStripeId(customerId, metaUserId);
        if (!userId) break;
        const amountPaidCents = Number(obj.amount_paid ?? obj.amountPaid ?? 0);
        const microUsd = amountPaidCents * 10_000;
        if (microUsd > 0) {
          await appendLedger({
            userId, kind: "subscription_grant", amountMicroUsd: microUsd,
            stripeEventId: event.id, description: "Subscription billing cycle",
            metadata: { invoiceId: obj.id },
          });
          await createInvoice({
            userId, description: "Subscription invoice", status: "paid",
            stripeInvoiceId: obj.id as string,
            stripeEventId: event.id,
            hostedUrl: obj.hosted_invoice_url as string | undefined,
            lineItems: [{ description: obj.lines?.data?.[0]?.description ?? "Plan", quantity: 1, unitMicroUsd: microUsd, amountMicroUsd: microUsd }],
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const userId = await findUserByStripeId(customerId, metaUserId);
        if (userId) {
          logger.warn({ userId, eventId: event.id }, "Stripe invoice.payment_failed");
        }
        break;
      }
      case "charge.refunded": {
        const userId = await findUserByStripeId(customerId, metaUserId);
        if (!userId) break;
        const amountRefundedCents = Number(obj.amount_refunded ?? 0);
        const microUsd = amountRefundedCents * 10_000;
        if (microUsd > 0) {
          await appendLedger({
            userId, kind: "stripe_refund", amountMicroUsd: -microUsd,
            stripeEventId: event.id, description: "Stripe refund",
            metadata: { chargeId: obj.id },
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const userId = await findUserByStripeId(customerId, metaUserId);
        if (!userId) break;
        const planId = (obj.items?.data?.[0]?.price?.lookup_key ?? obj.metadata?.planId ?? "free") as string;
        const rawStatus = (event.type === "customer.subscription.deleted" ? "canceled" : (obj.status ?? "active")) as typeof subscriptionsTable.$inferInsert.status;
        const subId = (obj.id as string) ?? null;
        if (subId) {
          await db.insert(subscriptionsTable).values({
            userId, stripeCustomerId: customerId ?? null, stripeSubscriptionId: subId,
            status: rawStatus, planId,
          }).onConflictDoUpdate({
            target: subscriptionsTable.stripeSubscriptionId,
            set: { userId, stripeCustomerId: customerId ?? null, status: rawStatus, planId, updatedAt: new Date() },
          });
        }
        if (event.type === "customer.subscription.deleted" || planId === "free") {
          await db.update(usersTable).set({ plan: "free" }).where(eq(usersTable.id, userId));
        } else if (["pro", "team"].includes(planId)) {
          await db.update(usersTable).set({ plan: planId as "pro" | "team" }).where(eq(usersTable.id, userId));
        }
        break;
      }
      default:
        break;
    }

    await db.update(billingEventsTable).set({ processedAt: new Date() }).where(eq(billingEventsTable.stripeEventId, event.id));
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook processing failed";
    await db.update(billingEventsTable).set({ errorMessage: msg }).where(eq(billingEventsTable.stripeEventId, event.id));
    logger.error({ eventId: event.id, err: msg }, "Stripe webhook handler failed");
    return { ok: false, error: msg };
  }
}
