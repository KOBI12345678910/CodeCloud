export interface Webhook { id: string; projectId: string; url: string; events: string[]; secret: string; active: boolean; createdAt: Date; lastTriggered: Date | null; failCount: number; }
export interface WebhookDelivery { id: string; webhookId: string; event: string; payload: Record<string, any>; statusCode: number | null; response: string | null; deliveredAt: Date; }
class WebhookSystemService {
  private webhooks: Map<string, Webhook> = new Map();
  private deliveries: WebhookDelivery[] = [];
  create(data: { projectId: string; url: string; events: string[] }): Webhook {
    const id = `wh-${Date.now()}`; const w: Webhook = { id, ...data, secret: `whsec_${Math.random().toString(36).slice(2, 18)}`, active: true, createdAt: new Date(), lastTriggered: null, failCount: 0 };
    this.webhooks.set(id, w); return w;
  }
  trigger(webhookId: string, event: string, payload: Record<string, any>): WebhookDelivery | null {
    const w = this.webhooks.get(webhookId); if (!w || !w.active) return null;
    w.lastTriggered = new Date();
    const d: WebhookDelivery = { id: `whd-${Date.now()}`, webhookId, event, payload, statusCode: 200, response: "OK", deliveredAt: new Date() };
    this.deliveries.push(d); return d;
  }
  get(id: string): Webhook | null { return this.webhooks.get(id) || null; }
  listByProject(projectId: string): Webhook[] { return Array.from(this.webhooks.values()).filter(w => w.projectId === projectId); }
  getDeliveries(webhookId: string): WebhookDelivery[] { return this.deliveries.filter(d => d.webhookId === webhookId); }
  update(id: string, data: Partial<Pick<Webhook, "url" | "events" | "active">>): Webhook | null { const w = this.webhooks.get(id); if (!w) return null; Object.assign(w, data); return w; }
  delete(id: string): boolean { return this.webhooks.delete(id); }
}
export const webhookSystemService = new WebhookSystemService();
