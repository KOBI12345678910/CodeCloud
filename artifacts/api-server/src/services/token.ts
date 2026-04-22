import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { db, refreshTokensTable } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  console.warn("[token] JWT_ACCESS_SECRET and/or JWT_REFRESH_SECRET not set. JWT auth endpoints will be unavailable.");
}
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  family: string;
  type: "refresh";
}

const blacklistedTokens = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of blacklistedTokens) {
    if (expiry < now) blacklistedTokens.delete(token);
  }
}, 60 * 1000);

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function requireJwtSecrets(): { accessSecret: string; refreshSecret: string } {
  if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    throw new Error("JWT secrets are not configured. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables.");
  }
  return { accessSecret: ACCESS_TOKEN_SECRET, refreshSecret: REFRESH_TOKEN_SECRET };
}

export function generateAccessToken(user: { id: string; email: string; role: string }): string {
  const { accessSecret } = requireJwtSecrets();
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: "access",
  };
  return jwt.sign(payload, accessSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(userId: string, family?: string): { token: string; family: string } {
  const { refreshSecret } = requireJwtSecrets();
  const tokenFamily = family || randomBytes(16).toString("hex");
  const payload: RefreshTokenPayload = {
    sub: userId,
    family: tokenFamily,
    type: "refresh",
  };
  const token = jwt.sign(payload, refreshSecret, {
    expiresIn: Math.floor(REFRESH_TOKEN_EXPIRY_MS / 1000),
  });
  return { token, family: tokenFamily };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const { accessSecret } = requireJwtSecrets();
  if (blacklistedTokens.has(hashToken(token))) {
    throw new Error("Token has been revoked");
  }
  const payload = jwt.verify(token, accessSecret) as AccessTokenPayload;
  if (payload.type !== "access") throw new Error("Invalid token type");
  return payload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const { refreshSecret } = requireJwtSecrets();
  const payload = jwt.verify(token, refreshSecret) as RefreshTokenPayload;
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  return payload;
}

export function blacklistAccessToken(token: string): void {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      blacklistedTokens.set(hashToken(token), decoded.exp * 1000);
    }
  } catch {
    // ignore
  }
}

export async function storeRefreshToken(
  userId: string,
  token: string,
  family: string,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  await db.insert(refreshTokensTable).values({
    userId,
    tokenHash: hashToken(token),
    family,
    userAgent,
    ipAddress,
    expiresAt,
  });
}

export async function validateAndRotateRefreshToken(
  token: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ userId: string; newFamily: string } | null> {
  const payload = verifyRefreshToken(token);
  const tokenH = hashToken(token);

  const [storedToken] = await db
    .select()
    .from(refreshTokensTable)
    .where(eq(refreshTokensTable.tokenHash, tokenH));

  if (!storedToken) {
    await db
      .update(refreshTokensTable)
      .set({ isRevoked: true })
      .where(eq(refreshTokensTable.family, payload.family));
    return null;
  }

  if (storedToken.isRevoked) {
    await db
      .update(refreshTokensTable)
      .set({ isRevoked: true })
      .where(eq(refreshTokensTable.family, payload.family));
    return null;
  }

  if (storedToken.expiresAt < new Date()) {
    return null;
  }

  await db
    .update(refreshTokensTable)
    .set({ isRevoked: true })
    .where(eq(refreshTokensTable.tokenHash, tokenH));

  return { userId: payload.sub, newFamily: payload.family };
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db
    .update(refreshTokensTable)
    .set({ isRevoked: true })
    .where(eq(refreshTokensTable.userId, userId));
}

export async function revokeTokenFamily(family: string): Promise<void> {
  await db
    .update(refreshTokensTable)
    .set({ isRevoked: true })
    .where(eq(refreshTokensTable.family, family));
}

export async function cleanupExpiredTokens(): Promise<void> {
  await db
    .delete(refreshTokensTable)
    .where(lt(refreshTokensTable.expiresAt, new Date()));
}
