import crypto from "crypto";
import { db, apiKeysTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export interface ScopeDetails {
  accessLevel: "read" | "write" | "admin";
  resources: string[];
}

export async function createApiKey(data: {
  userId: string;
  name: string;
  scopes?: string;
  scopeDetails?: ScopeDetails;
  expiresAt?: Date;
}) {
  const rawKey = `cc_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 10);

  const [key] = await db.insert(apiKeysTable).values({
    userId: data.userId,
    name: data.name,
    keyHash,
    keyPrefix,
    scopes: data.scopes || "read",
    scopeDetails: data.scopeDetails || { accessLevel: "read", resources: ["*"] },
    expiresAt: data.expiresAt,
    isActive: true,
  }).returning();

  return { key, rawKey };
}

export async function listApiKeysByUser(userId: string) {
  return db.select({
    id: apiKeysTable.id,
    name: apiKeysTable.name,
    keyPrefix: apiKeysTable.keyPrefix,
    scopes: apiKeysTable.scopes,
    scopeDetails: apiKeysTable.scopeDetails,
    isActive: apiKeysTable.isActive,
    lastUsedAt: apiKeysTable.lastUsedAt,
    expiresAt: apiKeysTable.expiresAt,
    createdAt: apiKeysTable.createdAt,
  }).from(apiKeysTable).where(eq(apiKeysTable.userId, userId));
}

export async function getApiKey(id: string) {
  const [key] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, id));
  return key ?? null;
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const [updated] = await db.update(apiKeysTable)
    .set({ isActive: false })
    .where(eq(apiKeysTable.id, id))
    .returning();
  return !!updated;
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const [key] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, id));
  if (!key) return false;
  await db.delete(apiKeysTable).where(eq(apiKeysTable.id, id));
  return true;
}

export async function validateApiKeyFromHeader(rawKey: string) {
  const keyHash = hashKey(rawKey);
  const [key] = await db.select().from(apiKeysTable).where(
    and(eq(apiKeysTable.keyHash, keyHash), eq(apiKeysTable.isActive, true))
  );

  if (!key) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;

  await db.update(apiKeysTable).set({ lastUsedAt: new Date() }).where(eq(apiKeysTable.id, key.id));
  return key;
}

export function hasRequiredScope(key: { scopeDetails: unknown }, requiredLevel: "read" | "write" | "admin"): boolean {
  const details = key.scopeDetails as ScopeDetails | null;
  if (!details) return false;

  const levels = { read: 1, write: 2, admin: 3 };
  return (levels[details.accessLevel] || 0) >= (levels[requiredLevel] || 0);
}
