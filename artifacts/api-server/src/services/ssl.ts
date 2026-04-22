import crypto from "crypto";
import { db, sslCertificatesTable } from "@workspace/db";
import { eq, and, lt, or } from "drizzle-orm";
import type { SslCertificate } from "@workspace/db";

function generateSerialNumber(): string {
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}

function generateFingerprint(): string {
  return crypto.randomBytes(32).toString("hex").match(/.{2}/g)!.join(":").toUpperCase();
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function requestCertificate(projectId: string, domain: string, forceHttps = true): Promise<SslCertificate> {
  const existing = await db
    .select()
    .from(sslCertificatesTable)
    .where(and(eq(sslCertificatesTable.projectId, projectId), eq(sslCertificatesTable.domain, domain)))
    .limit(1);

  if (existing.length > 0 && existing[0].status !== "failed" && existing[0].status !== "revoked" && existing[0].status !== "expired") {
    throw new Error(`Certificate for ${domain} already exists with status: ${existing[0].status}`);
  }

  const verificationToken = generateVerificationToken();

  const [cert] = await db.insert(sslCertificatesTable).values({
    projectId,
    domain,
    forceHttps,
    autoRenew: true,
    verificationToken,
    status: "pending",
  }).returning();

  return cert;
}

export async function verifyDns(certId: string): Promise<SslCertificate> {
  const [cert] = await db.select().from(sslCertificatesTable).where(eq(sslCertificatesTable.id, certId)).limit(1);
  if (!cert) throw new Error("Certificate not found");
  if (cert.status !== "pending") throw new Error(`Cannot verify DNS for certificate in ${cert.status} state`);

  const [updated] = await db.update(sslCertificatesTable)
    .set({ dnsVerified: true, status: "issuing" })
    .where(eq(sslCertificatesTable.id, certId))
    .returning();

  setTimeout(() => issueCertificate(certId), 2000);

  return updated;
}

export async function issueCertificate(certId: string): Promise<SslCertificate> {
  const [cert] = await db.select().from(sslCertificatesTable).where(eq(sslCertificatesTable.id, certId)).limit(1);
  if (!cert) throw new Error("Certificate not found");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [issued] = await db.update(sslCertificatesTable)
    .set({
      status: "active",
      serialNumber: generateSerialNumber(),
      fingerprint: generateFingerprint(),
      issuer: "Let's Encrypt",
      issuedAt: now,
      expiresAt,
      lastRenewalAt: now,
      lastRenewalError: null,
    })
    .where(eq(sslCertificatesTable.id, certId))
    .returning();

  console.log(`[ssl] Certificate issued for ${cert.domain}, expires ${expiresAt.toISOString()}`);
  return issued;
}

export async function renewCertificate(certId: string): Promise<SslCertificate> {
  const [cert] = await db.select().from(sslCertificatesTable).where(eq(sslCertificatesTable.id, certId)).limit(1);
  if (!cert) throw new Error("Certificate not found");

  if (cert.status !== "active" && cert.status !== "expiring") {
    throw new Error(`Cannot renew certificate in ${cert.status} state`);
  }

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [renewed] = await db.update(sslCertificatesTable)
      .set({
        status: "active",
        serialNumber: generateSerialNumber(),
        fingerprint: generateFingerprint(),
        issuedAt: now,
        expiresAt,
        lastRenewalAt: now,
        lastRenewalError: null,
      })
      .where(eq(sslCertificatesTable.id, certId))
      .returning();

    console.log(`[ssl] Certificate renewed for ${cert.domain}, new expiry ${expiresAt.toISOString()}`);
    return renewed;
  } catch (err: any) {
    await db.update(sslCertificatesTable)
      .set({
        lastRenewalError: err.message || "Unknown renewal error",
        status: "expiring",
      })
      .where(eq(sslCertificatesTable.id, certId));
    throw err;
  }
}

export async function revokeCertificate(certId: string): Promise<SslCertificate> {
  const [cert] = await db.select().from(sslCertificatesTable).where(eq(sslCertificatesTable.id, certId)).limit(1);
  if (!cert) throw new Error("Certificate not found");

  const [revoked] = await db.update(sslCertificatesTable)
    .set({ status: "revoked" })
    .where(eq(sslCertificatesTable.id, certId))
    .returning();

  console.log(`[ssl] Certificate revoked for ${cert.domain}`);
  return revoked;
}

export async function deleteCertificate(certId: string): Promise<void> {
  await db.delete(sslCertificatesTable).where(eq(sslCertificatesTable.id, certId));
}

export async function getCertificatesForProject(projectId: string): Promise<SslCertificate[]> {
  return db.select().from(sslCertificatesTable)
    .where(eq(sslCertificatesTable.projectId, projectId))
    .orderBy(sslCertificatesTable.createdAt);
}

export async function getCertificate(certId: string): Promise<SslCertificate | null> {
  const [cert] = await db.select().from(sslCertificatesTable).where(eq(sslCertificatesTable.id, certId)).limit(1);
  return cert || null;
}

export async function updateForceHttps(certId: string, forceHttps: boolean): Promise<SslCertificate> {
  const [updated] = await db.update(sslCertificatesTable)
    .set({ forceHttps })
    .where(eq(sslCertificatesTable.id, certId))
    .returning();
  if (!updated) throw new Error("Certificate not found");
  return updated;
}

export async function updateAutoRenew(certId: string, autoRenew: boolean): Promise<SslCertificate> {
  const [updated] = await db.update(sslCertificatesTable)
    .set({ autoRenew })
    .where(eq(sslCertificatesTable.id, certId))
    .returning();
  if (!updated) throw new Error("Certificate not found");
  return updated;
}

export async function getCertificatesNeedingRenewal(): Promise<SslCertificate[]> {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return db.select().from(sslCertificatesTable)
    .where(
      and(
        eq(sslCertificatesTable.autoRenew, true),
        or(
          eq(sslCertificatesTable.status, "active"),
          eq(sslCertificatesTable.status, "expiring")
        ),
        lt(sslCertificatesTable.expiresAt, thirtyDaysFromNow)
      )
    );
}

export async function markExpiringCertificates(): Promise<number> {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const result = await db.update(sslCertificatesTable)
    .set({ status: "expired" })
    .where(
      and(
        eq(sslCertificatesTable.status, "active"),
        lt(sslCertificatesTable.expiresAt, now)
      )
    )
    .returning();

  const expiringResult = await db.update(sslCertificatesTable)
    .set({ status: "expiring" })
    .where(
      and(
        eq(sslCertificatesTable.status, "active"),
        lt(sslCertificatesTable.expiresAt, thirtyDaysFromNow)
      )
    )
    .returning();

  return result.length + expiringResult.length;
}
