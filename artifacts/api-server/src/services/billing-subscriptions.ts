export interface Subscription { id: string; userId: string; plan: "free" | "pro" | "team"; status: "active" | "canceled" | "past_due" | "trialing"; currentPeriodStart: Date; currentPeriodEnd: Date; cancelAtPeriodEnd: boolean; }
export interface Invoice { id: string; userId: string; amount: number; currency: string; status: "paid" | "open" | "void" | "uncollectible"; description: string; createdAt: Date; paidAt: Date | null; }
export interface UsageRecord { userId: string; metric: string; value: number; recordedAt: Date; }
class BillingSubscriptionsService {
  private subs: Map<string, Subscription> = new Map();
  private invoices: Invoice[] = [];
  private usage: UsageRecord[] = [];
  subscribe(userId: string, plan: Subscription["plan"]): Subscription {
    const id = `sub-${Date.now()}`; const now = new Date(); const end = new Date(now); end.setMonth(end.getMonth() + 1);
    const sub: Subscription = { id, userId, plan, status: "active", currentPeriodStart: now, currentPeriodEnd: end, cancelAtPeriodEnd: false };
    this.subs.set(id, sub); return sub;
  }
  cancel(id: string): Subscription | null { const s = this.subs.get(id); if (!s) return null; s.cancelAtPeriodEnd = true; return s; }
  changePlan(id: string, plan: Subscription["plan"]): Subscription | null { const s = this.subs.get(id); if (!s) return null; s.plan = plan; return s; }
  getByUser(userId: string): Subscription | null { return Array.from(this.subs.values()).find(s => s.userId === userId) || null; }
  getInvoices(userId: string): Invoice[] { return this.invoices.filter(i => i.userId === userId); }
  recordUsage(userId: string, metric: string, value: number): UsageRecord { const r: UsageRecord = { userId, metric, value, recordedAt: new Date() }; this.usage.push(r); return r; }
  getUsage(userId: string, metric?: string): UsageRecord[] { let records = this.usage.filter(u => u.userId === userId); if (metric) records = records.filter(u => u.metric === metric); return records; }
}
export const billingSubscriptionsService = new BillingSubscriptionsService();
