import { Router } from "express";
const r = Router();

interface WhiteLabelConfig {
  orgId: string;
  branding: {
    logo: string | null;
    logoDark: string | null;
    favicon: string | null;
    appName: string;
    tagline: string;
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
  };
  domain: {
    customDomain: string | null;
    sslStatus: "active" | "pending" | "none";
    cname: string;
  };
  emails: {
    fromName: string;
    fromEmail: string;
    replyTo: string;
    smtpConfigured: boolean;
    templates: Record<string, { subject: string; body: string }>;
  };
  features: {
    hidePoweredBy: boolean;
    customLoginPage: boolean;
    customErrorPages: boolean;
    customOnboarding: boolean;
    whitelistedDomains: string[];
  };
  seo: {
    title: string;
    description: string;
    ogImage: string | null;
    twitterHandle: string | null;
  };
  updatedAt: string;
}

const configs = new Map<string, WhiteLabelConfig>();

r.get("/white-label/:orgId", (req, res) => {
  const c = configs.get(req.params.orgId);
  if (!c) {
    return res.json({
      configured: false,
      plan: "enterprise",
      features: ["custom-logo", "custom-colors", "custom-domain", "custom-emails", "hide-powered-by", "custom-login", "custom-error-pages", "custom-onboarding", "seo-controls", "whitelisted-domains"],
    });
  }
  res.json({ configured: true, config: c });
});

r.post("/white-label/:orgId", (req, res) => {
  const { orgId } = req.params;
  const { branding = {}, domain = {}, emails = {}, features = {}, seo = {} } = req.body;
  const c: WhiteLabelConfig = {
    orgId,
    branding: {
      logo: branding.logo || null, logoDark: branding.logoDark || null, favicon: branding.favicon || null,
      appName: branding.appName || "CodeCloud", tagline: branding.tagline || "Build anything with AI",
      primaryColor: branding.primaryColor || "#6366f1", accentColor: branding.accentColor || "#8b5cf6",
      backgroundColor: branding.backgroundColor || "#0f172a", textColor: branding.textColor || "#f8fafc",
      fontFamily: branding.fontFamily || "Inter",
    },
    domain: {
      customDomain: domain.customDomain || null,
      sslStatus: domain.customDomain ? "pending" : "none",
      cname: `${orgId}.codecloud.app`,
    },
    emails: {
      fromName: emails.fromName || "CodeCloud", fromEmail: emails.fromEmail || `noreply@${orgId}.codecloud.app`,
      replyTo: emails.replyTo || "", smtpConfigured: !!emails.smtpHost,
      templates: emails.templates || {},
    },
    features: {
      hidePoweredBy: features.hidePoweredBy ?? false, customLoginPage: features.customLoginPage ?? false,
      customErrorPages: features.customErrorPages ?? false, customOnboarding: features.customOnboarding ?? false,
      whitelistedDomains: features.whitelistedDomains || [],
    },
    seo: {
      title: seo.title || "", description: seo.description || "",
      ogImage: seo.ogImage || null, twitterHandle: seo.twitterHandle || null,
    },
    updatedAt: new Date().toISOString(),
  };
  configs.set(orgId, c);
  res.status(201).json(c);
});

r.patch("/white-label/:orgId", (req, res) => {
  const c = configs.get(req.params.orgId);
  if (!c) return res.status(404).json({ error: "not configured" });
  if (req.body.branding) Object.assign(c.branding, req.body.branding);
  if (req.body.domain) Object.assign(c.domain, req.body.domain);
  if (req.body.emails) Object.assign(c.emails, req.body.emails);
  if (req.body.features) Object.assign(c.features, req.body.features);
  if (req.body.seo) Object.assign(c.seo, req.body.seo);
  c.updatedAt = new Date().toISOString();
  res.json(c);
});

r.get("/white-label/:orgId/preview", (req, res) => {
  const c = configs.get(req.params.orgId);
  if (!c) return res.status(404).json({ error: "not configured" });
  res.json({
    previewUrl: `https://${c.domain.customDomain || c.domain.cname}/preview`,
    css: `:root { --primary: ${c.branding.primaryColor}; --accent: ${c.branding.accentColor}; --bg: ${c.branding.backgroundColor}; --text: ${c.branding.textColor}; --font: ${c.branding.fontFamily}; }`,
  });
});

export default r;
