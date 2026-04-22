import * as OTPAuth from "otpauth";
import crypto from "crypto";
import QRCode from "qrcode";
import { db, twoFactorTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const APP_NAME = "CodeCloud";

export function generateTOTPSecret(email: string) {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

export function verifyTOTPToken(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

export function generateBackupCodes(count: number = 10): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
}

function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.toUpperCase()).digest("hex");
}

export async function generateQRCodeDataURL(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export async function getUserTwoFactor(userId: string) {
  const [record] = await db
    .select()
    .from(twoFactorTable)
    .where(eq(twoFactorTable.userId, userId));
  return record || null;
}

export async function setupTwoFactor(userId: string, secret: string, backupCodes: string[]) {
  const hashedCodes = backupCodes.map(hashBackupCode);
  const existing = await getUserTwoFactor(userId);
  if (existing) {
    await db
      .update(twoFactorTable)
      .set({
        secret,
        enabled: false,
        backupCodes: JSON.stringify(hashedCodes),
        verifiedAt: null,
      })
      .where(eq(twoFactorTable.userId, userId));
  } else {
    await db.insert(twoFactorTable).values({
      userId,
      secret,
      enabled: false,
      backupCodes: JSON.stringify(hashedCodes),
    });
  }
}

export async function enableTwoFactor(userId: string) {
  await db
    .update(twoFactorTable)
    .set({ enabled: true, verifiedAt: new Date() })
    .where(eq(twoFactorTable.userId, userId));
}

export async function disableTwoFactor(userId: string) {
  await db.delete(twoFactorTable).where(eq(twoFactorTable.userId, userId));
}

export async function consumeBackupCode(userId: string, code: string): Promise<boolean> {
  const record = await getUserTwoFactor(userId);
  if (!record || !record.backupCodes) return false;

  const hashedCodes: string[] = JSON.parse(record.backupCodes);
  const inputHash = hashBackupCode(code);
  const idx = hashedCodes.indexOf(inputHash);
  if (idx === -1) return false;

  hashedCodes.splice(idx, 1);
  await db
    .update(twoFactorTable)
    .set({ backupCodes: JSON.stringify(hashedCodes) })
    .where(eq(twoFactorTable.userId, userId));

  return true;
}
