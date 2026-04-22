import { Router, Request, Response } from "express";
import { requireJwtAuth } from "../middlewares/jwtAuth";
import type { AuthenticatedRequest } from "../types";
import {
  configureSSOProvider,
  getSSOConfig,
  listSSOByOrg,
  toggleSSOConfig,
  deleteSSOConfig,
  generateSPMetadata,
  initiateLogin,
} from "../services/sso-provider";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";
import { db, orgMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function requireOrgAdmin(req: Request, res: Response, orgId: string): Promise<boolean> {
  const { userId } = req as AuthenticatedRequest;
  const [membership] = await db.select().from(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, userId)));
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    res.status(403).json({ error: "Org admin access required" });
    return false;
  }
  return true;
}

router.get("/sso-provider/org/:orgId", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const orgId = req.params.orgId as string;
  if (!(await requireOrgAdmin(req, res, orgId))) return;
  const configs = await listSSOByOrg(orgId);
  res.json(configs);
});

router.post("/sso-provider", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { orgId, provider, entityId, loginUrl, certificate, metadataXml } = req.body;
  if (!orgId || !provider || !entityId || !loginUrl || !certificate) {
    res.status(400).json({ error: "orgId, provider, entityId, loginUrl, and certificate are required" });
    return;
  }
  if (!(await requireOrgAdmin(req, res, orgId))) return;

  const config = await configureSSOProvider({ orgId, provider, entityId, loginUrl, certificate, metadataXml });
  const { userId } = req as AuthenticatedRequest;

  logAudit({
    userId,
    action: "settings.update",
    resourceType: "organization",
    resourceId: orgId,
    metadata: { action: "sso_configured", provider },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  res.status(201).json(config);
});

router.get("/sso-provider/:id", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const config = await getSSOConfig(req.params.id as string);
  if (!config) { res.status(404).json({ error: "Not found" }); return; }
  if (!(await requireOrgAdmin(req, res, config.orgId))) return;
  res.json(config);
});

router.get("/sso/metadata/:orgId", async (req: Request, res: Response): Promise<void> => {
  const xml = generateSPMetadata(req.params.orgId as string);
  res.set("Content-Type", "application/xml");
  res.send(xml);
});

router.post("/sso-provider/:id/login", async (req: Request, res: Response): Promise<void> => {
  const session = await initiateLogin(req.params.id as string);
  session ? res.json(session) : res.status(404).json({ error: "Not found or disabled" });
});

router.post("/sso/acs/:orgId", async (req: Request, res: Response): Promise<void> => {
  const { SAMLResponse, RelayState } = req.body;
  if (!SAMLResponse) {
    res.status(400).json({ error: "Missing SAMLResponse" });
    return;
  }

  try {
    const configs = await listSSOByOrg(req.params.orgId as string);
    const activeConfig = configs.find(c => c.enabled);
    if (!activeConfig) {
      res.status(404).json({ error: "No active SSO configuration for this organization" });
      return;
    }

    const decoded = Buffer.from(SAMLResponse, "base64").toString("utf-8");
    const xmlCrypto = await import("xml-crypto");

    const sigMatch = decoded.match(/<(?:ds:)?Signature[\s\S]*?<\/(?:ds:)?Signature>/);
    if (!sigMatch) {
      res.status(400).json({ error: "SAML response missing signature" });
      return;
    }

    if (!activeConfig.certificate) {
      res.status(500).json({ error: "SSO configuration missing IdP certificate" });
      return;
    }

    const cert = activeConfig.certificate.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, "");
    const pemCert = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`;

    const sig = new xmlCrypto.SignedXml({ publicCert: pemCert });
    sig.loadSignature(sigMatch[0]);
    const isValid = sig.checkSignature(decoded);

    if (!isValid) {
      logAudit({
        userId: "system",
        action: "user.sso_login_failed",
        resourceType: "organization",
        resourceId: req.params.orgId as string,
        metadata: { reason: "invalid_signature", configId: activeConfig.id },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });
      res.status(400).json({ error: "SAML assertion signature verification failed" });
      return;
    }

    const issuerMatch = decoded.match(/<(?:saml2?:)?Issuer[^>]*>([^<]+)<\/(?:saml2?:)?Issuer>/);
    if (activeConfig.entityId && issuerMatch && issuerMatch[1]?.trim() !== activeConfig.entityId) {
      res.status(400).json({ error: "SAML assertion issuer does not match configured IdP entity ID" });
      return;
    }

    const audienceMatch = decoded.match(/<(?:saml2?:)?Audience[^>]*>([^<]+)<\/(?:saml2?:)?Audience>/);
    const expectedAudience = `${process.env.APP_URL || "http://localhost:5173"}/api/sso/metadata/${req.params.orgId}`;
    if (audienceMatch && audienceMatch[1]?.trim() !== expectedAudience) {
      res.status(400).json({ error: "SAML assertion audience restriction mismatch" });
      return;
    }

    const notBeforeMatch = decoded.match(/NotBefore="([^"]+)"/);
    const notOnOrAfterMatch = decoded.match(/NotOnOrAfter="([^"]+)"/);
    const now = new Date();

    if (notBeforeMatch && new Date(notBeforeMatch[1]) > now) {
      res.status(400).json({ error: "SAML assertion is not yet valid (NotBefore)" });
      return;
    }
    if (notOnOrAfterMatch && new Date(notOnOrAfterMatch[1]) <= now) {
      res.status(400).json({ error: "SAML assertion has expired (NotOnOrAfter)" });
      return;
    }

    const emailMatch = decoded.match(/<(?:saml2?:)?NameID[^>]*>([^<]+)<\/(?:saml2?:)?NameID>/);
    if (!emailMatch || !emailMatch[1]) {
      res.status(400).json({ error: "Could not extract user identity from SAML assertion" });
      return;
    }

    const email = emailMatch[1].trim();

    logAudit({
      userId: "system",
      action: "user.sso_login",
      resourceType: "organization",
      resourceId: req.params.orgId as string,
      metadata: { email, provider: activeConfig.provider, configId: activeConfig.id },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.json({
      success: true,
      email,
      orgId: req.params.orgId,
      configId: activeConfig.id,
      relayState: RelayState || null,
    });
  } catch (err) {
    console.error("[SSO ACS] Error processing SAML response:", err);
    res.status(500).json({ error: "Failed to process SAML assertion" });
  }
});

router.post("/sso-provider/:id/toggle", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const existing = await getSSOConfig(req.params.id as string);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (!(await requireOrgAdmin(req, res, existing.orgId))) return;

  const config = await toggleSSOConfig(req.params.id as string);
  config ? res.json(config) : res.status(404).json({ error: "Not found" });
});

router.delete("/sso-provider/:id", requireJwtAuth, async (req: Request, res: Response): Promise<void> => {
  const existing = await getSSOConfig(req.params.id as string);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (!(await requireOrgAdmin(req, res, existing.orgId))) return;

  const deleted = await deleteSSOConfig(req.params.id as string);
  deleted ? res.json({ success: true }) : res.status(404).json({ error: "Not found" });
});

export default router;
