import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import crypto from "crypto";

const router: IRouter = Router();

const requireAdmin = async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): Promise<void> => {
  const { user } = req as AuthenticatedRequest;
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin access required" }); return; }
  next();
};

interface ServicePrice {
  id: string;
  category: string;
  service: string;
  displayName: string;
  description: string;
  pricingModel: "per_unit" | "per_token" | "per_gb" | "per_month" | "per_request" | "per_minute" | "flat" | "tiered";
  basePriceMicroUsd: number;
  marginPercent: number;
  finalPriceMicroUsd: number;
  currency: string;
  unit: string;
  minQuantity: number;
  maxQuantity: number;
  enabled: boolean;
  tiers?: { from: number; to: number; priceMicroUsd: number }[];
  metadata: Record<string, any>;
  updatedAt: string;
  updatedBy: string;
}

interface AiModelPricing {
  modelId: string;
  provider: string;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  marginPercent: number;
  finalInputPer1k: number;
  finalOutputPer1k: number;
  enabled: boolean;
  rateLimit: number;
  dailyLimit: number;
  updatedAt: string;
}

const DEFAULT_SERVICE_PRICES: ServicePrice[] = [
  { id: "sub_starter", category: "subscription", service: "starter_plan", displayName: "Starter Plan", description: "Free tier with basic features", pricingModel: "per_month", basePriceMicroUsd: 0, marginPercent: 0, finalPriceMicroUsd: 0, currency: "usd", unit: "month", minQuantity: 1, maxQuantity: 1, enabled: true, metadata: {}, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "sub_core", category: "subscription", service: "core_plan", displayName: "Core Plan", description: "For personal projects & simple apps", pricingModel: "per_month", basePriceMicroUsd: 15_000_000, marginPercent: 33, finalPriceMicroUsd: 20_000_000, currency: "usd", unit: "month", minQuantity: 1, maxQuantity: 1, enabled: true, metadata: { annualDiscountPercent: 10 }, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "sub_pro", category: "subscription", service: "pro_plan", displayName: "Pro Plan", description: "For commercial and professional apps", pricingModel: "per_month", basePriceMicroUsd: 60_000_000, marginPercent: 67, finalPriceMicroUsd: 100_000_000, currency: "usd", unit: "month", minQuantity: 1, maxQuantity: 1, enabled: true, metadata: { annualDiscountPercent: 10 }, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "sub_enterprise", category: "subscription", service: "enterprise_plan", displayName: "Enterprise Plan", description: "Custom enterprise pricing", pricingModel: "flat", basePriceMicroUsd: 0, marginPercent: 0, finalPriceMicroUsd: 0, currency: "usd", unit: "month", minQuantity: 1, maxQuantity: 1, enabled: true, metadata: { customPricing: true }, updatedAt: new Date().toISOString(), updatedBy: "system" },

  { id: "ai_tokens_input", category: "ai", service: "ai_input_tokens", displayName: "AI Input Tokens", description: "Cost per 1K input tokens (base rate, model-specific overrides apply)", pricingModel: "per_token", basePriceMicroUsd: 500, marginPercent: 40, finalPriceMicroUsd: 700, currency: "usd", unit: "1k_tokens", minQuantity: 1, maxQuantity: 999999999, enabled: true, metadata: {}, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "ai_tokens_output", category: "ai", service: "ai_output_tokens", displayName: "AI Output Tokens", description: "Cost per 1K output tokens (base rate)", pricingModel: "per_token", basePriceMicroUsd: 1500, marginPercent: 40, finalPriceMicroUsd: 2100, currency: "usd", unit: "1k_tokens", minQuantity: 1, maxQuantity: 999999999, enabled: true, metadata: {}, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "ai_image_gen", category: "ai", service: "ai_image_generation", displayName: "AI Image Generation", description: "Per image generated", pricingModel: "per_unit", basePriceMicroUsd: 20_000, marginPercent: 50, finalPriceMicroUsd: 30_000, currency: "usd", unit: "image", minQuantity: 1, maxQuantity: 100, enabled: true, metadata: {}, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "ai_voice", category: "ai", service: "ai_voice", displayName: "AI Voice/TTS", description: "Per minute of audio generated", pricingModel: "per_minute", basePriceMicroUsd: 15_000, marginPercent: 40, finalPriceMicroUsd: 21_000, currency: "usd", unit: "minute", minQuantity: 1, maxQuantity: 60, enabled: true, metadata: {}, updatedAt: new Date().toISOString(), updatedBy: "system" },

  { id: "domain_register", category: "domains", service: "domain_registration", displayName: "Domain Registration", description: "Register a new domain (.com, .dev, .app, etc.)", pricingModel: "per_unit", basePriceMicroUsd: 8_000_000, marginPercent: 50, finalPriceMicroUsd: 12_000_000, currency: "usd", unit: "domain/year", minQuantity: 1, maxQuantity: 100, enabled: true, metadata: { tlds: [".com", ".dev", ".app", ".io", ".co", ".net", ".org", ".xyz", ".ai", ".cloud"] }, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "domain_transfer", category: "domains", service: "domain_transfer", displayName: "Domain Transfer", description: "Transfer an existing domain", pricingModel: "per_unit", basePriceMicroUsd: 6_000_000, marginPercent: 50, finalPriceMicroUsd: 9_000_000, currency: "usd", unit: "domain", minQuantity: 1, maxQuantity: 10, enabled: true, metadata: {}, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "ssl_cert", category: "domains", service: "ssl_certificate", displayName: "SSL Certificate", description: "Premium wildcard SSL certificate", pricingModel: "per_unit", basePriceMicroUsd: 50_000_000, marginPercent: 60, finalPriceMicroUsd: 80_000_000, currency: "usd", unit: "cert/year", minQuantity: 1, maxQuantity: 10, enabled: true, metadata: { freeBasicIncluded: true }, updatedAt: new Date().toISOString(), updatedBy: "system" },

  { id: "cloud_compute_basic", category: "cloud", service: "compute_basic", displayName: "Basic Compute", description: "1 vCPU, 1 GB RAM container", pricingModel: "per_month", basePriceMicroUsd: 3_000_000, marginPercent: 67, finalPriceMicroUsd: 5_000_000, currency: "usd", unit: "container/month", minQuantity: 1, maxQuantity: 10, enabled: true, metadata: { vcpu: 1, ramGb: 1 }, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "cloud_compute_pro", category: "cloud", service: "compute_pro", displayName: "Pro Compute", description: "4 vCPU, 8 GB RAM container", pricingModel: "per_month", basePriceMicroUsd: 15_000_000, marginPercent: 67, finalPriceMicroUsd: 25_000_000, currency: "usd", unit: "container/month", minQuantity: 1, maxQuantity: 10, enabled: true, metadata: { vcpu: 4, ramGb: 8 }, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "cloud_compute_gpu", category: "cloud", service: "compute_gpu", displayName: "GPU Compute", description: "NVIDIA A100 GPU instance", pricingModel: "per_minute", basePriceMicroUsd: 50_000, marginPercent: 40, finalPriceMicroUsd: 70_000, currency: "usd", unit: "minute", minQuantity: 1, maxQuantity: 1440, enabled: true, metadata: { gpu: "A100" }, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "cloud_storage", category: "cloud", service: "cloud_storage", displayName: "Cloud Storage", description: "Persistent SSD storage", pricingModel: "per_gb", basePriceMicroUsd: 150_000, marginPercent: 60, finalPriceMicroUsd: 240_000, currency: "usd", unit: "gb/month", minQuantity: 1, maxQuantity: 10000, enabled: true, metadata: {}, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "cloud_bandwidth", category: "cloud", service: "bandwidth", displayName: "Bandwidth", description: "Outbound data transfer", pricingModel: "per_gb", basePriceMicroUsd: 80_000, marginPercent: 50, finalPriceMicroUsd: 120_000, currency: "usd", unit: "gb", minQuantity: 1, maxQuantity: 100000, enabled: true, metadata: { freeGbIncluded: 100 }, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "cloud_cdn", category: "cloud", service: "cdn", displayName: "CDN", description: "Global CDN with 300+ PoPs", pricingModel: "per_gb", basePriceMicroUsd: 50_000, marginPercent: 60, finalPriceMicroUsd: 80_000, currency: "usd", unit: "gb", minQuantity: 1, maxQuantity: 100000, enabled: true, metadata: { pops: 300 }, updatedAt: new Date().toISOString(), updatedBy: "system" },

  { id: "db_postgres", category: "database", service: "postgres", displayName: "PostgreSQL Database", description: "Managed PostgreSQL with auto-backups", pricingModel: "per_month", basePriceMicroUsd: 5_000_000, marginPercent: 60, finalPriceMicroUsd: 8_000_000, currency: "usd", unit: "instance/month", minQuantity: 1, maxQuantity: 10, enabled: true, metadata: { maxStorageGb: 10, autoBackup: true }, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "db_redis", category: "database", service: "redis", displayName: "Redis Cache", description: "Managed Redis for caching", pricingModel: "per_month", basePriceMicroUsd: 3_000_000, marginPercent: 67, finalPriceMicroUsd: 5_000_000, currency: "usd", unit: "instance/month", minQuantity: 1, maxQuantity: 5, enabled: true, metadata: { maxMemoryMb: 256 }, updatedAt: new Date().toISOString(), updatedBy: "system" },

  { id: "email_basic", category: "email", service: "email_basic", displayName: "Email Service", description: "Transactional email sending (SMTP)", pricingModel: "per_request", basePriceMicroUsd: 500, marginPercent: 100, finalPriceMicroUsd: 1000, currency: "usd", unit: "email", minQuantity: 1, maxQuantity: 1000000, enabled: true, metadata: { freeMonthly: 1000 }, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "email_pro", category: "email", service: "email_pro", displayName: "Professional Email (Gmail)", description: "Google Workspace email per user", pricingModel: "per_month", basePriceMicroUsd: 4_000_000, marginPercent: 50, finalPriceMicroUsd: 6_000_000, currency: "usd", unit: "user/month", minQuantity: 1, maxQuantity: 500, enabled: true, metadata: { provider: "google_workspace" }, updatedAt: new Date().toISOString(), updatedBy: "system" },

  { id: "sec_waf", category: "security", service: "waf", displayName: "Web Application Firewall", description: "Enterprise WAF with DDoS protection", pricingModel: "per_month", basePriceMicroUsd: 10_000_000, marginPercent: 50, finalPriceMicroUsd: 15_000_000, currency: "usd", unit: "month", minQuantity: 1, maxQuantity: 1, enabled: true, metadata: {}, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "sec_pentest", category: "security", service: "penetration_test", displayName: "Penetration Testing", description: "Automated security scan + report", pricingModel: "per_unit", basePriceMicroUsd: 200_000_000, marginPercent: 50, finalPriceMicroUsd: 300_000_000, currency: "usd", unit: "scan", minQuantity: 1, maxQuantity: 10, enabled: true, metadata: {}, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "sec_soc", category: "security", service: "soc_monitoring", displayName: "24/7 SOC Monitoring", description: "Security operations center monitoring", pricingModel: "per_month", basePriceMicroUsd: 500_000_000, marginPercent: 40, finalPriceMicroUsd: 700_000_000, currency: "usd", unit: "month", minQuantity: 1, maxQuantity: 1, enabled: true, metadata: {}, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "sec_compliance", category: "security", service: "compliance_audit", displayName: "Compliance Audit", description: "SOC2 / ISO27001 / GDPR audit", pricingModel: "per_unit", basePriceMicroUsd: 1_000_000_000, marginPercent: 30, finalPriceMicroUsd: 1_300_000_000, currency: "usd", unit: "audit", minQuantity: 1, maxQuantity: 5, enabled: true, metadata: { frameworks: ["SOC2", "ISO27001", "GDPR", "HIPAA", "PCI-DSS"] }, updatedAt: new Date().toISOString(), updatedBy: "system" },

  { id: "support_priority", category: "support", service: "priority_support", displayName: "Priority Support", description: "24/7 priority support with <1hr SLA", pricingModel: "per_month", basePriceMicroUsd: 50_000_000, marginPercent: 60, finalPriceMicroUsd: 80_000_000, currency: "usd", unit: "month", minQuantity: 1, maxQuantity: 1, enabled: true, metadata: { slaHours: 1 }, updatedAt: new Date().toISOString(), updatedBy: "system" },
  { id: "support_dedicated", category: "support", service: "dedicated_engineer", displayName: "Dedicated Engineer", description: "Dedicated support engineer for your team", pricingModel: "per_month", basePriceMicroUsd: 3_000_000_000, marginPercent: 50, finalPriceMicroUsd: 4_500_000_000, currency: "usd", unit: "month", minQuantity: 1, maxQuantity: 5, enabled: true, metadata: {}, updatedAt: new Date().toISOString(), updatedBy: "system" },
];

let servicePrices: ServicePrice[] = [...DEFAULT_SERVICE_PRICES];
let aiModelPricing: Map<string, AiModelPricing> = new Map();
let globalMarginPercent = 40;
let globalCurrencyMarkup: Record<string, number> = { eur: 1.05, gbp: 1.03, ils: 1.08, jpy: 1.06 };

router.get("/admin/pricing/services", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const categories = [...new Set(servicePrices.map(s => s.category))];
  res.json({
    services: servicePrices,
    categories,
    totalServices: servicePrices.length,
    globalMarginPercent,
    globalCurrencyMarkup,
    revenue: {
      estimatedMrrMicroUsd: servicePrices.filter(s => s.pricingModel === "per_month" && s.enabled).reduce((sum, s) => sum + s.finalPriceMicroUsd, 0),
    },
  });
});

router.get("/catalog/services", requireAuth, async (_req, res): Promise<void> => {
  const enabled = servicePrices.filter(s => s.enabled);
  res.json({
    services: enabled.map(s => ({
      id: s.id, category: s.category, displayName: s.displayName,
      description: s.description, pricingModel: s.pricingModel,
      finalPriceMicroUsd: s.finalPriceMicroUsd, unit: s.unit,
      enabled: s.enabled, metadata: s.metadata,
    })),
    categories: [...new Set(enabled.map(s => s.category))],
  });
});

router.patch("/admin/pricing/services/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { id } = req.params;
  const { user, userId } = req as AuthenticatedRequest;
  const body = req.body ?? {};
  const idx = servicePrices.findIndex(s => s.id === id);
  if (idx === -1) { res.status(404).json({ error: "Service not found" }); return; }

  const svc = { ...servicePrices[idx] };
  if (typeof body.basePriceMicroUsd === "number") svc.basePriceMicroUsd = body.basePriceMicroUsd;
  if (typeof body.marginPercent === "number") svc.marginPercent = body.marginPercent;
  if (typeof body.enabled === "boolean") svc.enabled = body.enabled;
  if (typeof body.displayName === "string") svc.displayName = body.displayName;
  if (typeof body.description === "string") svc.description = body.description;
  if (typeof body.minQuantity === "number") svc.minQuantity = body.minQuantity;
  if (typeof body.maxQuantity === "number") svc.maxQuantity = body.maxQuantity;
  if (body.tiers) svc.tiers = body.tiers;
  if (body.metadata) svc.metadata = { ...svc.metadata, ...body.metadata };

  svc.finalPriceMicroUsd = Math.round(svc.basePriceMicroUsd * (1 + svc.marginPercent / 100));
  svc.updatedAt = new Date().toISOString();
  svc.updatedBy = userId;
  servicePrices[idx] = svc;
  res.json(svc);
});

router.post("/admin/pricing/services", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const body = req.body ?? {};
  if (!body.service || !body.category || !body.displayName) { res.status(400).json({ error: "service, category, displayName required" }); return; }
  const svc: ServicePrice = {
    id: `custom_${crypto.randomUUID().slice(0, 8)}`,
    category: body.category,
    service: body.service,
    displayName: body.displayName,
    description: body.description || "",
    pricingModel: body.pricingModel || "per_unit",
    basePriceMicroUsd: body.basePriceMicroUsd || 0,
    marginPercent: body.marginPercent ?? globalMarginPercent,
    finalPriceMicroUsd: Math.round((body.basePriceMicroUsd || 0) * (1 + (body.marginPercent ?? globalMarginPercent) / 100)),
    currency: "usd",
    unit: body.unit || "unit",
    minQuantity: body.minQuantity || 1,
    maxQuantity: body.maxQuantity || 999,
    enabled: true,
    tiers: body.tiers,
    metadata: body.metadata || {},
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };
  servicePrices.push(svc);
  res.status(201).json(svc);
});

router.delete("/admin/pricing/services/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { id } = req.params;
  const idx = servicePrices.findIndex(s => s.id === id);
  if (idx === -1) { res.status(404).json({ error: "Service not found" }); return; }
  if (!servicePrices[idx].id.startsWith("custom_")) { res.status(400).json({ error: "Cannot delete system services, only disable them" }); return; }
  servicePrices.splice(idx, 1);
  res.json({ deleted: true });
});

router.patch("/admin/pricing/global", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const body = req.body ?? {};
  if (typeof body.marginPercent === "number") {
    globalMarginPercent = body.marginPercent;
    servicePrices = servicePrices.map(s => ({
      ...s,
      marginPercent: body.applyToAll ? globalMarginPercent : s.marginPercent,
      finalPriceMicroUsd: body.applyToAll
        ? Math.round(s.basePriceMicroUsd * (1 + globalMarginPercent / 100))
        : s.finalPriceMicroUsd,
    }));
  }
  if (body.currencyMarkup) globalCurrencyMarkup = { ...globalCurrencyMarkup, ...body.currencyMarkup };
  res.json({ globalMarginPercent, globalCurrencyMarkup, servicesUpdated: servicePrices.length });
});

router.get("/admin/pricing/ai-models", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const models = Array.from(aiModelPricing.values());
  res.json({
    models,
    totalModels: models.length,
    defaultMarginPercent: globalMarginPercent,
  });
});

router.patch("/admin/pricing/ai-models/:modelId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { modelId } = req.params;
  const body = req.body ?? {};
  const existing = aiModelPricing.get(modelId) || {
    modelId, provider: body.provider || "unknown",
    inputCostPer1kTokens: 0.5, outputCostPer1kTokens: 1.5,
    marginPercent: globalMarginPercent, finalInputPer1k: 0.7, finalOutputPer1k: 2.1,
    enabled: true, rateLimit: 100, dailyLimit: 10000,
    updatedAt: new Date().toISOString(),
  };
  if (typeof body.inputCostPer1kTokens === "number") existing.inputCostPer1kTokens = body.inputCostPer1kTokens;
  if (typeof body.outputCostPer1kTokens === "number") existing.outputCostPer1kTokens = body.outputCostPer1kTokens;
  if (typeof body.marginPercent === "number") existing.marginPercent = body.marginPercent;
  if (typeof body.enabled === "boolean") existing.enabled = body.enabled;
  if (typeof body.rateLimit === "number") existing.rateLimit = body.rateLimit;
  if (typeof body.dailyLimit === "number") existing.dailyLimit = body.dailyLimit;
  existing.finalInputPer1k = existing.inputCostPer1kTokens * (1 + existing.marginPercent / 100);
  existing.finalOutputPer1k = existing.outputCostPer1kTokens * (1 + existing.marginPercent / 100);
  existing.updatedAt = new Date().toISOString();
  aiModelPricing.set(modelId, existing);
  res.json(existing);
});

router.get("/admin/pricing/revenue-simulator", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const users = Number(req.query.users || 1000);
  const conversionRate = Number(req.query.conversionRate || 5) / 100;
  const avgRevenuePerUser = Number(req.query.arpu || 50);
  const churnRate = Number(req.query.churn || 3) / 100;
  const months = Number(req.query.months || 12);

  const projection = [];
  let currentUsers = users;
  let totalRevenue = 0;
  for (let m = 1; m <= months; m++) {
    const newUsers = Math.round(users * 0.1 * m);
    const paidUsers = Math.round((currentUsers + newUsers) * conversionRate);
    const mrr = paidUsers * avgRevenuePerUser * 1_000_000;
    const churnedUsers = Math.round(paidUsers * churnRate);
    currentUsers = currentUsers + newUsers - churnedUsers;
    totalRevenue += mrr;
    projection.push({ month: m, totalUsers: currentUsers, paidUsers, mrr: mrr / 1_000_000, arr: (mrr * 12) / 1_000_000, churnedUsers, cumulativeRevenue: totalRevenue / 1_000_000 });
  }
  res.json({ projection, summary: { totalRevenue: totalRevenue / 1_000_000, finalMrr: projection[projection.length - 1]?.mrr || 0, finalArr: projection[projection.length - 1]?.arr || 0 } });
});

export default router;
