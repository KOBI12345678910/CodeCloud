import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { randomBytes } from "crypto";
import { db, webhooksTable, webhookDeliveriesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";
import { retryDelivery, WEBHOOK_EVENTS } from "../services/webhooks";

const router = Router();

const CreateWebhookSchema = z.object({
  url: z.string().url().max(500),
  events: z.array(z.string()).min(1).max(20),
  projectId: z.string().uuid().optional(),
  description: z.string().max(255).optional(),
});

const UpdateWebhookSchema = z.object({
  url: z.string().url().max(500).optional(),
  events: z.array(z.string()).min(1).max(20).optional(),
  description: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
});

router.get("/webhooks/events", (_req: Request, res: Response): void => {
  res.json({ events: WEBHOOK_EVENTS });
});

router.get("/webhooks", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;

  const webhooks = await db
    .select()
    .from(webhooksTable)
    .where(eq(webhooksTable.userId, userId))
    .orderBy(desc(webhooksTable.createdAt));

  const parsed = webhooks.map((wh) => ({
    ...wh,
    events: JSON.parse(wh.events),
    secret: undefined,
  }));

  res.json({ webhooks: parsed });
});

router.post("/webhooks", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;

  const body = CreateWebhookSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const secret = "whsec_" + randomBytes(24).toString("hex");

  const [webhook] = await db.insert(webhooksTable).values({
    userId,
    url: body.data.url,
    events: JSON.stringify(body.data.events),
    projectId: body.data.projectId || null,
    description: body.data.description || null,
    secret,
  }).returning();

  logAudit({
    userId,
    action: "webhook.create" as any,
    resourceType: "webhook" as any,
    resourceId: webhook.id,
    metadata: { url: body.data.url, events: body.data.events },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.status(201).json({
    webhook: {
      ...webhook,
      events: body.data.events,
    },
  });
});

router.get("/webhooks/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const webhookId = req.params["id"] as string;

  const [webhook] = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.id, webhookId), eq(webhooksTable.userId, userId)));

  if (!webhook) {
    res.status(404).json({ error: "Webhook not found" });
    return;
  }

  res.json({
    webhook: {
      ...webhook,
      events: JSON.parse(webhook.events),
    },
  });
});

router.patch("/webhooks/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const webhookId = req.params["id"] as string;

  const body = UpdateWebhookSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.id, webhookId), eq(webhooksTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Webhook not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (body.data.url !== undefined) updates.url = body.data.url;
  if (body.data.events !== undefined) updates.events = JSON.stringify(body.data.events);
  if (body.data.description !== undefined) updates.description = body.data.description;
  if (body.data.isActive !== undefined) updates.isActive = body.data.isActive;

  const [updated] = await db
    .update(webhooksTable)
    .set(updates)
    .where(eq(webhooksTable.id, webhookId))
    .returning();

  logAudit({
    userId,
    action: "webhook.update" as any,
    resourceType: "webhook" as any,
    resourceId: webhookId,
    metadata: { changes: Object.keys(updates) },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({
    webhook: {
      ...updated,
      events: JSON.parse(updated.events),
    },
  });
});

router.delete("/webhooks/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const webhookId = req.params["id"] as string;

  const [existing] = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.id, webhookId), eq(webhooksTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Webhook not found" });
    return;
  }

  await db.delete(webhooksTable).where(eq(webhooksTable.id, webhookId));

  logAudit({
    userId,
    action: "webhook.delete" as any,
    resourceType: "webhook" as any,
    resourceId: webhookId,
    metadata: { url: existing.url },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ success: true });
});

router.get("/webhooks/:id/deliveries", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const webhookId = req.params["id"] as string;
  const limit = Math.min(parseInt(req.query["limit"] as string) || 20, 100);
  const offset = parseInt(req.query["offset"] as string) || 0;

  const [webhook] = await db
    .select({ id: webhooksTable.id })
    .from(webhooksTable)
    .where(and(eq(webhooksTable.id, webhookId), eq(webhooksTable.userId, userId)));

  if (!webhook) {
    res.status(404).json({ error: "Webhook not found" });
    return;
  }

  const deliveries = await db
    .select()
    .from(webhookDeliveriesTable)
    .where(eq(webhookDeliveriesTable.webhookId, webhookId))
    .orderBy(desc(webhookDeliveriesTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ deliveries });
});

router.post("/webhooks/deliveries/:id/retry", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const deliveryId = req.params["id"] as string;

  const [delivery] = await db
    .select({ webhookId: webhookDeliveriesTable.webhookId })
    .from(webhookDeliveriesTable)
    .where(eq(webhookDeliveriesTable.id, deliveryId));

  if (!delivery) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  const [webhook] = await db
    .select({ id: webhooksTable.id })
    .from(webhooksTable)
    .where(and(eq(webhooksTable.id, delivery.webhookId), eq(webhooksTable.userId, userId)));

  if (!webhook) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await retryDelivery(deliveryId);

  res.json(result);
});

export default router;
