import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

export const PLANS = {
  free: {
    id: "free",
    name: "Starter",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: {
      projects: 3,
      storageMb: 500,
      computeHoursPerMonth: 10,
      aiTokensPerDay: 50,
      deployments: 0,
      collaborators: 0,
      alwaysOn: false,
      customDomains: 0,
      privateProjects: false,
      githubIntegration: false,
      sshAccess: false,
      gpu: false,
      priorityQueue: false,
      sla: "0",
      support: "community",
      containerRam: 512,
      containerCpu: 0.5,
      containerTimeout: 15,
      maxFileSize: 1,
      bandwidth: 1,
      storageDisplay: "500 MB",
      computeDisplay: "10 hrs/mo",
      aiDisplay: "50/day",
      bandwidthDisplay: "1 GB/mo",
    },
    stripePriceId: null,
    stripeYearlyPriceId: null,
  },
  starter: {
    id: "starter",
    name: "Starter+",
    monthlyPrice: 7,
    yearlyPrice: 70,
    features: {
      projects: 10,
      storageMb: 5120,
      computeHoursPerMonth: 50,
      aiTokensPerDay: 200,
      deployments: 3,
      collaborators: 3,
      alwaysOn: false,
      customDomains: 1,
      privateProjects: true,
      githubIntegration: true,
      sshAccess: false,
      gpu: false,
      priorityQueue: false,
      sla: "0",
      support: "email",
      containerRam: 1024,
      containerCpu: 1,
      containerTimeout: 30,
      maxFileSize: 10,
      bandwidth: 10,
      storageDisplay: "5 GB",
      computeDisplay: "50 hrs/mo",
      aiDisplay: "200/day",
      bandwidthDisplay: "10 GB/mo",
    },
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    stripeYearlyPriceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || null,
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPrice: 20,
    yearlyPrice: 200,
    features: {
      projects: -1,
      storageMb: 51200,
      computeHoursPerMonth: 200,
      aiTokensPerDay: 1000,
      deployments: 20,
      collaborators: 10,
      alwaysOn: true,
      customDomains: 5,
      privateProjects: true,
      githubIntegration: true,
      sshAccess: true,
      gpu: true,
      priorityQueue: true,
      sla: "99.5",
      support: "priority",
      containerRam: 2048,
      containerCpu: 2,
      containerTimeout: 60,
      maxFileSize: 50,
      bandwidth: 100,
      storageDisplay: "50 GB",
      computeDisplay: "200 hrs/mo",
      aiDisplay: "1000/day",
      bandwidthDisplay: "100 GB/mo",
    },
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
    stripeYearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || null,
  },
  team: {
    id: "team",
    name: "Team",
    monthlyPrice: 25,
    yearlyPrice: 250,
    perUser: true,
    features: {
      projects: -1,
      storageMb: 102400,
      computeHoursPerMonth: 500,
      aiTokensPerDay: 5000,
      deployments: -1,
      collaborators: -1,
      alwaysOn: true,
      customDomains: 20,
      privateProjects: true,
      githubIntegration: true,
      sshAccess: true,
      gpu: true,
      priorityQueue: true,
      sla: "99.9",
      support: "dedicated",
      containerRam: 4096,
      containerCpu: 4,
      containerTimeout: 120,
      maxFileSize: 100,
      bandwidth: 500,
      storageDisplay: "100 GB",
      computeDisplay: "500 hrs/mo",
      aiDisplay: "5000/day",
      bandwidthDisplay: "500 GB/mo",
    },
    stripePriceId: process.env.STRIPE_TEAM_PRICE_ID || null,
    stripeYearlyPriceId: process.env.STRIPE_TEAM_YEARLY_PRICE_ID || null,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: -1,
    yearlyPrice: -1,
    features: {
      projects: -1,
      storageMb: -1,
      computeHoursPerMonth: -1,
      aiTokensPerDay: -1,
      deployments: -1,
      collaborators: -1,
      alwaysOn: true,
      customDomains: -1,
      privateProjects: true,
      githubIntegration: true,
      sshAccess: true,
      gpu: true,
      priorityQueue: true,
      sla: "99.99",
      support: "white-glove",
      containerRam: 16384,
      containerCpu: 8,
      containerTimeout: -1,
      maxFileSize: 500,
      bandwidth: -1,
      storageDisplay: "Unlimited",
      computeDisplay: "Unlimited",
      aiDisplay: "Unlimited",
      bandwidthDisplay: "Unlimited",
    },
    stripePriceId: null,
    stripeYearlyPriceId: null,
  },
} as const;

export const METERED_PRICES = {
  compute: {
    name: "Compute Cycles",
    unit: "cycle",
    description: "1 cycle = 1 vCPU-hour",
    pricePerUnit: 0.05,
    freeIncluded: { free: 10, starter: 50, pro: 200, team: 500, enterprise: -1 },
    stripeMeterEventName: "compute_cycles",
  },
  ai_tokens: {
    name: "AI Credits",
    unit: "credit",
    description: "1 credit = ~1000 tokens",
    pricePerUnit: 0.01,
    freeIncluded: { free: 50, starter: 200, pro: 1000, team: 5000, enterprise: -1 },
    stripeMeterEventName: "ai_credits",
  },
  bandwidth: {
    name: "Bandwidth",
    unit: "GB",
    description: "Outbound data transfer",
    pricePerUnit: 0.10,
    freeIncluded: { free: 1, starter: 10, pro: 100, team: 500, enterprise: -1 },
    stripeMeterEventName: "bandwidth_gb",
  },
  storage_overage: {
    name: "Storage Overage",
    unit: "GB",
    description: "Additional storage beyond plan limit",
    pricePerUnit: 0.25,
    freeIncluded: { free: 0.5, starter: 5, pro: 50, team: 100, enterprise: -1 },
    stripeMeterEventName: "storage_overage_gb",
  },
  always_on: {
    name: "Always-On",
    unit: "container",
    description: "Container that never sleeps",
    pricePerUnit: 7.00,
    freeIncluded: { free: 0, starter: 0, pro: 1, team: 5, enterprise: -1 },
    stripeMeterEventName: "always_on_containers",
  },
  gpu_compute: {
    name: "GPU Compute",
    unit: "hour",
    description: "NVIDIA T4 GPU hours",
    pricePerUnit: 0.50,
    freeIncluded: { free: 0, starter: 0, pro: 0, team: 10, enterprise: -1 },
    stripeMeterEventName: "gpu_hours",
  },
};

const usageStore = new Map<string, number>();

export class MeteredBillingService {
  async reportUsage(userId: string, meterEvent: string, quantity: number): Promise<void> {
    const monthKey = new Date().toISOString().substring(0, 7);
    const key = `${userId}:${meterEvent}:${monthKey}`;
    const current = usageStore.get(key) || 0;
    usageStore.set(key, current + quantity);
    logger.debug(`Metered usage reported: ${meterEvent} +${quantity} for user ${userId}`);
  }

  async hasAvailableCredits(userId: string, meterType: keyof typeof METERED_PRICES): Promise<{
    available: boolean;
    used: number;
    included: number;
    overage: number;
    estimatedCost: number;
  }> {
    const [user] = await db.select({ plan: usersTable.plan }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const plan = (user?.plan || "free") as keyof typeof PLANS;
    const meter = METERED_PRICES[meterType];

    const included = meter.freeIncluded[plan] ?? 0;
    if (included === -1) return { available: true, used: 0, included: -1, overage: 0, estimatedCost: 0 };

    const monthKey = new Date().toISOString().substring(0, 7);
    const key = `${userId}:${meter.stripeMeterEventName}:${monthKey}`;
    const used = usageStore.get(key) || 0;

    const overage = Math.max(0, used - included);
    const estimatedCost = overage * meter.pricePerUnit;

    return {
      available: included === -1 || used < included * 2,
      used,
      included,
      overage,
      estimatedCost,
    };
  }

  async getBillingSummary(userId: string): Promise<{
    plan: (typeof PLANS)[keyof typeof PLANS];
    interval: "month" | "year";
    status: string;
    currentPeriod: { start: string; end: string };
    baseCost: number;
    meteredUsage: {
      type: string;
      name: string;
      used: number;
      included: number;
      overage: number;
      cost: number;
      unit: string;
    }[];
    totalEstimatedCost: number;
    invoiceHistory: { id: string; number: string; date: string; amount: number; status: string; pdfUrl: string | null; hostedUrl: string | null }[];
    paymentMethod: { type: string; brand: string; last4: string; expMonth: number; expYear: number } | null;
    nextInvoiceDate: string | null;
  }> {
    const [user] = await db.select({ plan: usersTable.plan }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const plan = PLANS[(user?.plan || "free") as keyof typeof PLANS] || PLANS.free;

    const monthKey = new Date().toISOString().substring(0, 7);
    const meteredUsage = [];
    let totalMeteredCost = 0;

    for (const [type, meter] of Object.entries(METERED_PRICES)) {
      const key = `${userId}:${meter.stripeMeterEventName}:${monthKey}`;
      const used = usageStore.get(key) || 0;
      const included = meter.freeIncluded[(user?.plan || "free") as keyof typeof meter.freeIncluded] ?? 0;
      const overage = included === -1 ? 0 : Math.max(0, used - included);
      const cost = overage * meter.pricePerUnit;
      totalMeteredCost += cost;

      meteredUsage.push({
        type,
        name: meter.name,
        used: Math.round(used * 100) / 100,
        included: included === -1 ? Infinity : included,
        overage: Math.round(overage * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        unit: meter.unit,
      });
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      plan,
      interval: "month",
      status: "active",
      currentPeriod: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
      baseCost: plan.monthlyPrice > 0 ? plan.monthlyPrice : 0,
      meteredUsage,
      totalEstimatedCost: (plan.monthlyPrice > 0 ? plan.monthlyPrice : 0) + totalMeteredCost,
      invoiceHistory: [],
      paymentMethod: null,
      nextInvoiceDate: periodEnd.toISOString(),
    };
  }

  getPricingData() {
    return {
      plans: Object.values(PLANS),
      meteredPrices: Object.entries(METERED_PRICES).map(([key, v]) => ({
        key,
        name: v.name,
        unit: v.unit,
        description: v.description,
        pricePerUnit: v.pricePerUnit,
      })),
      faq: [
        { q: "Can I try before I buy?", a: "Yes! Start with the free Starter plan. No credit card required." },
        { q: "What happens if I exceed my plan limits?", a: "You'll be billed for overage at the per-unit rates shown above. We'll warn you before charges apply." },
        { q: "Can I change plans anytime?", a: "Yes, upgrade or downgrade at any time. Changes are prorated." },
        { q: "Do you offer refunds?", a: "We offer a 14-day money-back guarantee on all paid plans." },
        { q: "What payment methods do you accept?", a: "We accept all major credit/debit cards and PayPal via Stripe." },
        { q: "Is there a student discount?", a: "Yes! Students get 50% off Pro plans. Contact us with a valid .edu email." },
      ],
    };
  }
}

export const meteredBillingService = new MeteredBillingService();
