import * as OTPAuth from "otpauth";
import * as QRCode from "qrcode";
import crypto from "crypto";
import { db, twoFactorSecretsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const APP_NAME = "CodeCloud";

function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase().match(/.{4}/g)!.join("-")
  );
}

export async function setupTwoFactor(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) throw new Error("User not found");

  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  const backupCodes = generateBackupCodes();
  const uri = totp.toString();
  const qrCodeUrl = await QRCode.toDataURL(uri);

  const existing = await db.select().from(twoFactorSecretsTable).where(eq(twoFactorSecretsTable.userId, userId));
  if (existing.length > 0) {
    await db.update(twoFactorSecretsTable).set({
      secret: secret.base32,
      method: "totp",
      enabled: false,
      verifiedAt: null,
      backupCodes: JSON.stringify(backupCodes),
    }).where(eq(twoFactorSecretsTable.userId, userId));
  } else {
    await db.insert(twoFactorSecretsTable).values({
      userId,
      secret: secret.base32,
      method: "totp",
      enabled: false,
      backupCodes: JSON.stringify(backupCodes),
    });
  }

  return { qrCodeUrl, secret: secret.base32, backupCodes, otpauthUrl: uri };
}

export async function verifyAndEnableTwoFactor(userId: string, code: string): Promise<boolean> {
  const [record] = await db.select().from(twoFactorSecretsTable).where(eq(twoFactorSecretsTable.userId, userId));
  if (!record) return false;

  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(record.secret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) return false;

  await db.update(twoFactorSecretsTable).set({
    enabled: true,
    verifiedAt: new Date(),
  }).where(eq(twoFactorSecretsTable.userId, userId));

  await db.update(usersTable).set({ twoFactorEnabled: true }).where(eq(usersTable.id, userId));
  return true;
}

export async function validateTwoFactorCode(userId: string, code: string): Promise<boolean> {
  const [record] = await db.select().from(twoFactorSecretsTable).where(eq(twoFactorSecretsTable.userId, userId));
  if (!record || !record.enabled) return true;

  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(record.secret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta !== null) return true;

  const backupCodes: string[] = record.backupCodes ? JSON.parse(record.backupCodes) : [];
  const idx = backupCodes.indexOf(code);
  if (idx >= 0) {
    backupCodes.splice(idx, 1);
    await db.update(twoFactorSecretsTable).set({
      backupCodes: JSON.stringify(backupCodes),
    }).where(eq(twoFactorSecretsTable.userId, userId));
    return true;
  }

  return false;
}

export async function disableTwoFactor(userId: string): Promise<boolean> {
  const [record] = await db.select().from(twoFactorSecretsTable).where(eq(twoFactorSecretsTable.userId, userId));
  if (!record) return false;

  await db.update(twoFactorSecretsTable).set({ enabled: false }).where(eq(twoFactorSecretsTable.userId, userId));
  await db.update(usersTable).set({ twoFactorEnabled: false }).where(eq(usersTable.id, userId));
  return true;
}

export async function getTwoFactorStatus(userId: string) {
  const [record] = await db.select().from(twoFactorSecretsTable).where(eq(twoFactorSecretsTable.userId, userId));
  return {
    enabled: record?.enabled ?? false,
    method: record?.method ?? null,
    verifiedAt: record?.verifiedAt ?? null,
  };
}

export async function regenerateBackupCodes(userId: string): Promise<string[] | null> {
  const [record] = await db.select().from(twoFactorSecretsTable).where(eq(twoFactorSecretsTable.userId, userId));
  if (!record || !record.enabled) return null;

  const codes = generateBackupCodes();
  await db.update(twoFactorSecretsTable).set({
    backupCodes: JSON.stringify(codes),
  }).where(eq(twoFactorSecretsTable.userId, userId));
  return codes;
}
