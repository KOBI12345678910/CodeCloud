import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import crypto from "crypto";

const router: IRouter = Router();

interface ServiceSubscription {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  category: string;
  status: "active" | "paused" | "cancelled" | "trial" | "past_due";
  quantity: number;
  priceMicroUsd: number;
  billingCycle: "monthly" | "yearly" | "one_time" | "usage_based";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  usageThisMonth: number;
  usageLimitMonthly: number;
  autoRenew: boolean;
  createdAt: string;
  metadata: Record<string, any>;
}

interface UsageRecord {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  category: string;
  quantity: number;
  unitCostMicroUsd: number;
  totalCostMicroUsd: number;
  timestamp: string;
  metadata: Record<string, any>;
}

interface Invoice {
  id: string;
  userId: string;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  amountMicroUsd: number;
  currency: string;
  lineItems: { serviceId: string; serviceName: string; quantity: number; unitPrice: number; total: number }[];
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  paymentMethod?: string;
}

const userSubscriptions = new Map<string, ServiceSubscription[]>();
const usageRecords = new Map<string, UsageRecord[]>();
const userInvoices = new Map<string, Invoice[]>();

router.get("/billing/services", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const subs = userSubscriptions.get(userId) || [];
  const usage = usageRecords.get(userId) || [];
  const invoices = userInvoices.get(userId) || [];

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyUsage = usage.filter(u => u.timestamp.startsWith(thisMonth));
  const monthlySpend = monthlyUsage.reduce((sum, u) => sum + u.totalCostMicroUsd, 0);
  const subscriptionSpend = subs.filter(s => s.status === "active").reduce((sum, s) => sum + s.priceMicroUsd, 0);

  const byCategory = new Map<string, number>();
  monthlyUsage.forEach(u => byCategory.set(u.category, (byCategory.get(u.category) || 0) + u.totalCostMicroUsd));
  subs.filter(s => s.status === "active").forEach(s => byCategory.set(s.category, (byCategory.get(s.category) || 0) + s.priceMicroUsd));

  res.json({
    subscriptions: subs,
    activeSubscriptions: subs.filter(s => s.status === "active").length,
    monthlyUsageRecords: monthlyUsage.length,
    spending: {
      subscriptionsMicroUsd: subscriptionSpend,
      subscriptionsUsd: subscriptionSpend / 1_000_000,
      usageMicroUsd: monthlySpend,
      usageUsd: monthlySpend / 1_000_000,
      totalMicroUsd: subscriptionSpend + monthlySpend,
      totalUsd: (subscriptionSpend + monthlySpend) / 1_000_000,
    },
    spendingByCategory: Object.fromEntries(byCategory),
    recentInvoices: invoices.slice(0, 10),
    paymentMethods: [],
  });
});

router.post("/billing/services/subscribe", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { serviceId, quantity, billingCycle, metadata } = req.body ?? {};
  if (!serviceId) { res.status(400).json({ error: "serviceId required" }); return; }

  let catalogPrice: { displayName: string; category: string; finalPriceMicroUsd: number } | null = null;
  try {
    const catResp = await fetch(`http://localhost:${process.env.PORT || 3001}/catalog/services`, { headers: { Authorization: req.headers.authorization || "" } });
    if (catResp.ok) {
      const data = await catResp.json();
      catalogPrice = data.services.find((s: any) => s.id === serviceId);
    }
  } catch { }

  const serviceName = catalogPrice?.displayName || serviceId;
  const category = catalogPrice?.category || "other";
  const priceMicroUsd = catalogPrice?.finalPriceMicroUsd || 0;

  const qty = Math.max(1, Math.min(1000, Number(quantity) || 1));
  const now = new Date();
  const endDate = new Date(now);
  if (billingCycle === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
  else endDate.setMonth(endDate.getMonth() + 1);

  const sub: ServiceSubscription = {
    id: `sub_${crypto.randomUUID().slice(0, 12)}`,
    userId,
    serviceId,
    serviceName,
    category,
    status: "active",
    quantity: qty,
    priceMicroUsd,
    billingCycle: billingCycle || "monthly",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: endDate.toISOString(),
    usageThisMonth: 0,
    usageLimitMonthly: 0,
    autoRenew: true,
    createdAt: now.toISOString(),
    metadata: metadata || {},
  };
  const subs = userSubscriptions.get(userId) || [];
  subs.push(sub);
  userSubscriptions.set(userId, subs);
  res.status(201).json(sub);
});

router.patch("/billing/services/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  const body = req.body ?? {};
  const subs = userSubscriptions.get(userId) || [];
  const idx = subs.findIndex(s => s.id === id);
  if (idx === -1) { res.status(404).json({ error: "Subscription not found" }); return; }

  if (typeof body.quantity === "number") subs[idx].quantity = body.quantity;
  if (typeof body.autoRenew === "boolean") subs[idx].autoRenew = body.autoRenew;
  if (body.status === "paused" || body.status === "cancelled") subs[idx].status = body.status;
  res.json(subs[idx]);
});

router.delete("/billing/services/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  const subs = userSubscriptions.get(userId) || [];
  const idx = subs.findIndex(s => s.id === id);
  if (idx === -1) { res.status(404).json({ error: "Subscription not found" }); return; }
  subs[idx].status = "cancelled";
  subs[idx].autoRenew = false;
  res.json({ cancelled: true, endsAt: subs[idx].currentPeriodEnd });
});

router.post("/billing/usage/record", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { serviceId, serviceName, category, quantity, unitCostMicroUsd, metadata } = req.body ?? {};
  if (!serviceId) { res.status(400).json({ error: "serviceId required" }); return; }

  const record: UsageRecord = {
    id: `usage_${crypto.randomUUID().slice(0, 12)}`,
    userId,
    serviceId,
    serviceName: serviceName || serviceId,
    category: category || "other",
    quantity: quantity || 1,
    unitCostMicroUsd: unitCostMicroUsd || 0,
    totalCostMicroUsd: (unitCostMicroUsd || 0) * (quantity || 1),
    timestamp: new Date().toISOString(),
    metadata: metadata || {},
  };
  const records = usageRecords.get(userId) || [];
  records.push(record);
  usageRecords.set(userId, records);
  res.status(201).json(record);
});

router.get("/billing/usage", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const records = (usageRecords.get(userId) || []).filter(r => r.timestamp.startsWith(month));
  const byService = new Map<string, { service: string; category: string; totalQuantity: number; totalCostMicroUsd: number; records: number }>();
  records.forEach(r => {
    const existing = byService.get(r.serviceId) || { service: r.serviceName, category: r.category, totalQuantity: 0, totalCostMicroUsd: 0, records: 0 };
    existing.totalQuantity += r.quantity;
    existing.totalCostMicroUsd += r.totalCostMicroUsd;
    existing.records++;
    byService.set(r.serviceId, existing);
  });
  res.json({
    month,
    records,
    summary: Object.fromEntries(byService),
    totalCostMicroUsd: records.reduce((sum, r) => sum + r.totalCostMicroUsd, 0),
    totalCostUsd: records.reduce((sum, r) => sum + r.totalCostMicroUsd, 0) / 1_000_000,
  });
});

router.get("/billing/invoices", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const invoices = userInvoices.get(userId) || [];
  res.json({ invoices, total: invoices.length });
});

router.post("/billing/invoices/generate", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const month = (req.body?.month as string) || new Date().toISOString().slice(0, 7);
  const subs = (userSubscriptions.get(userId) || []).filter(s => s.status === "active");
  const usage = (usageRecords.get(userId) || []).filter(r => r.timestamp.startsWith(month));

  const lineItems: Invoice["lineItems"] = [];
  subs.forEach(s => lineItems.push({ serviceId: s.serviceId, serviceName: s.serviceName, quantity: s.quantity, unitPrice: s.priceMicroUsd / 1_000_000, total: (s.priceMicroUsd * s.quantity) / 1_000_000 }));
  const usageByService = new Map<string, { name: string; qty: number; cost: number }>();
  usage.forEach(u => {
    const e = usageByService.get(u.serviceId) || { name: u.serviceName, qty: 0, cost: 0 };
    e.qty += u.quantity; e.cost += u.totalCostMicroUsd;
    usageByService.set(u.serviceId, e);
  });
  usageByService.forEach((v, k) => lineItems.push({ serviceId: k, serviceName: v.name, quantity: v.qty, unitPrice: v.cost / v.qty / 1_000_000, total: v.cost / 1_000_000 }));

  const total = lineItems.reduce((sum, li) => sum + li.total, 0);
  const now = new Date();
  const due = new Date(now); due.setDate(due.getDate() + 30);
  const invoice: Invoice = {
    id: `inv_${crypto.randomUUID().slice(0, 12)}`,
    userId,
    status: "open",
    amountMicroUsd: Math.round(total * 1_000_000),
    currency: "usd",
    lineItems,
    issuedAt: now.toISOString(),
    dueAt: due.toISOString(),
  };
  const invoices = userInvoices.get(userId) || [];
  invoices.unshift(invoice);
  userInvoices.set(userId, invoices);
  res.status(201).json(invoice);
});

router.get("/billing/spending-limits", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  res.json({
    userId,
    limits: {
      monthlyMax: { enabled: false, limitMicroUsd: 500_000_000, currentMicroUsd: 0 },
      dailyMax: { enabled: false, limitMicroUsd: 50_000_000, currentMicroUsd: 0 },
      perServiceMax: {},
      alertThresholds: [50, 80, 100],
    },
  });
});

router.put("/billing/spending-limits", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  res.json({ userId, updated: true, ...req.body });
});

router.get("/billing/payment-methods", requireAuth, async (req, res): Promise<void> => {
  res.json({
    methods: [],
    supportedTypes: ["card", "bank_transfer", "paypal", "crypto", "apple_pay", "google_pay", "wire_transfer", "invoice"],
  });
});

router.post("/billing/payment-methods", requireAuth, async (req, res): Promise<void> => {
  const { type, details } = req.body ?? {};
  if (!type) { res.status(400).json({ error: "Payment method type required" }); return; }
  res.status(201).json({
    id: `pm_${crypto.randomUUID().slice(0, 12)}`,
    type,
    last4: details?.last4 || "****",
    brand: details?.brand || type,
    isDefault: true,
    createdAt: new Date().toISOString(),
  });
});

export default router;
