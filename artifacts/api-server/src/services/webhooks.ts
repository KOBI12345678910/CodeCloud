import { createHmac } from "crypto";
import { db, webhooksTable, webhookDeliveriesTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

export type WebhookEvent =
  | "push"
  | "deploy"
  | "star"
  | "fork"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "collaborator.add"
  | "collaborator.remove";

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "push", label: "Code Push" },
  { value: "deploy", label: "Deployment" },
  { value: "star", label: "Star" },
  { value: "fork", label: "Fork" },
  { value: "project.create", label: "Project Created" },
  { value: "project.update", label: "Project Updated" },
  { value: "project.delete", label: "Project Deleted" },
  { value: "collaborator.add", label: "Collaborator Added" },
  { value: "collaborator.remove", label: "Collaborator Removed" },
];

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(payload: string, secret: string, signature: string): boolean {
  const expected = signPayload(payload, secret);
  return expected === signature;
}

interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
}

async function deliverWebhook(url: string, payload: string, secret: string): Promise<DeliveryResult> {
  const signature = signPayload(payload, secret);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Timestamp": new Date().toISOString(),
        "User-Agent": "CodeCloud-Webhooks/1.0",
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseText = await response.text().catch(() => "");
    const truncatedResponse = responseText.slice(0, 1000);

    return {
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      responseBody: truncatedResponse,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      errorMessage: message,
    };
  }
}

export async function dispatchWebhookEvent(
  event: WebhookEvent,
  data: {
    userId: string;
    projectId?: string;
    payload: Record<string, unknown>;
  }
): Promise<void> {
  const conditions = [eq(webhooksTable.isActive, true), eq(webhooksTable.userId, data.userId)];

  const webhooks = await db
    .select()
    .from(webhooksTable)
    .where(and(...conditions));

  const matchingWebhooks = webhooks.filter((wh) => {
    const events: string[] = JSON.parse(wh.events);
    return events.includes(event);
  }).filter((wh) => {
    if (data.projectId && wh.projectId) {
      return wh.projectId === data.projectId;
    }
    return true;
  });

  if (matchingWebhooks.length === 0) return;

  const fullPayload = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: data.payload,
  });

  for (const webhook of matchingWebhooks) {
    const [delivery] = await db.insert(webhookDeliveriesTable).values({
      webhookId: webhook.id,
      event,
      payload: fullPayload,
      url: webhook.url,
      status: "pending",
      attempts: 0,
    }).returning();

    const result = await deliverWebhook(webhook.url, fullPayload, webhook.secret);

    await db.update(webhookDeliveriesTable)
      .set({
        status: result.success ? "success" : "failed",
        statusCode: result.statusCode ?? null,
        responseBody: result.responseBody ?? null,
        errorMessage: result.errorMessage ?? null,
        attempts: 1,
        deliveredAt: new Date(),
      })
      .where(eq(webhookDeliveriesTable.id, delivery.id));

    if (!result.success) {
      logger.warn(`Webhook delivery failed for ${webhook.id}: ${result.errorMessage || result.statusCode}`);
    }
  }
}

export async function retryDelivery(deliveryId: string): Promise<DeliveryResult & { deliveryId: string }> {
  const [delivery] = await db
    .select()
    .from(webhookDeliveriesTable)
    .where(eq(webhookDeliveriesTable.id, deliveryId));

  if (!delivery) {
    return { deliveryId, success: false, errorMessage: "Delivery not found" };
  }

  const [webhook] = await db
    .select()
    .from(webhooksTable)
    .where(eq(webhooksTable.id, delivery.webhookId));

  if (!webhook) {
    return { deliveryId, success: false, errorMessage: "Webhook not found" };
  }

  const result = await deliverWebhook(delivery.url, delivery.payload, webhook.secret);

  await db.update(webhookDeliveriesTable)
    .set({
      status: result.success ? "success" : "failed",
      statusCode: result.statusCode ?? null,
      responseBody: result.responseBody ?? null,
      errorMessage: result.errorMessage ?? null,
      attempts: delivery.attempts + 1,
      deliveredAt: new Date(),
    })
    .where(eq(webhookDeliveriesTable.id, deliveryId));

  return { deliveryId, ...result };
}
