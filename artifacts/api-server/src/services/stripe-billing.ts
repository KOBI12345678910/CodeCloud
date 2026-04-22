export interface StripeCustomer { id: string; userId: string; email: string; stripeCustomerId: string; defaultPaymentMethod: string | null; createdAt: Date; }
export interface PaymentIntent { id: string; customerId: string; amount: number; currency: string; status: "pending" | "succeeded" | "failed" | "refunded"; description: string; createdAt: Date; }
class StripeBillingService {
  private customers: Map<string, StripeCustomer> = new Map();
  private payments: PaymentIntent[] = [];
  createCustomer(userId: string, email: string): StripeCustomer {
    const c: StripeCustomer = { id: `cust-${Date.now()}`, userId, email, stripeCustomerId: `cus_${Math.random().toString(36).slice(2, 14)}`, defaultPaymentMethod: null, createdAt: new Date() };
    this.customers.set(c.id, c); return c;
  }
  getCustomer(userId: string): StripeCustomer | null { return Array.from(this.customers.values()).find(c => c.userId === userId) || null; }
  createPayment(customerId: string, amount: number, description: string): PaymentIntent {
    const p: PaymentIntent = { id: `pi-${Date.now()}`, customerId, amount, currency: "usd", status: "succeeded", description, createdAt: new Date() };
    this.payments.push(p); return p;
  }
  getPayments(customerId: string): PaymentIntent[] { return this.payments.filter(p => p.customerId === customerId); }
  refund(paymentId: string): PaymentIntent | null { const p = this.payments.find(p => p.id === paymentId); if (!p) return null; p.status = "refunded"; return p; }
  getRevenue(period?: string): { total: number; count: number } { const valid = this.payments.filter(p => p.status === "succeeded"); return { total: valid.reduce((sum, p) => sum + p.amount, 0), count: valid.length }; }
}
export const stripeBillingService = new StripeBillingService();
