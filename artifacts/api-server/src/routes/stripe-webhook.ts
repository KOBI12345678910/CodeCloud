import { Router, type IRouter } from "express";
import express from "express";
import Stripe from "stripe";
import { handleStripeEvent, type StripeEvent } from "../services/credits/stripe-webhooks";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const stripe = stripeKey ? new Stripe(stripeKey) : null;

router.post(
  "/stripe/webhook",
  // Stripe requires the raw request body for signature verification.
  express.raw({ type: "application/json" }),
  async (req, res): Promise<void> => {
    const raw = req.body as Buffer;
    const signature = req.headers["stripe-signature"];

    let event: StripeEvent;

    if (stripe && webhookSecret) {
      // Verified path: only accept events whose signature matches our secret.
      if (typeof signature !== "string") {
        res.status(400).json({ error: "Missing stripe-signature header" });
        return;
      }
      try {
        event = stripe.webhooks.constructEvent(raw, signature, webhookSecret) as unknown as StripeEvent;
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Stripe webhook signature verification failed");
        res.status(400).json({ error: "Invalid signature" });
        return;
      }
    } else {
      // Test/dev path: only allowed when STRIPE_WEBHOOK_SECRET is unset AND
      // the request comes from localhost. Fail-closed in production-like envs.
      if (process.env.NODE_ENV === "production" || webhookSecret) {
        res.status(400).json({ error: "Webhook signature verification required" });
        return;
      }
      const remote = req.ip ?? "";
      const isLocal = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
      if (!isLocal) {
        res.status(400).json({ error: "Unverified webhooks only allowed from localhost in dev" });
        return;
      }
      try {
        event = JSON.parse(Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw)) as StripeEvent;
      } catch (err) {
        logger.warn({ err }, "Invalid stripe webhook payload (dev)");
        res.status(400).json({ error: "Invalid payload" });
        return;
      }
    }

    const out = await handleStripeEvent(event);
    if (!out.ok && !out.deduped) {
      res.status(500).json({ error: out.error ?? "Webhook processing failed" });
      return;
    }
    res.json({ received: true, deduped: out.deduped ?? false });
  },
);

export default router;
