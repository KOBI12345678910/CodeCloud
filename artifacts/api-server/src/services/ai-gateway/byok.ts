import type { Provider } from "./registry";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { db, aiByokKeysTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

let cachedDevKey: Buffer | null = null;

function getMasterKey(): Buffer {
  const seed = process.env.BYOK_SECRET || process.env.SESSION_SECRET || process.env.SECRETS_ENCRYPTION_KEY;
  if (!seed) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BYOK_SECRET, SESSION_SECRET, or SECRETS_ENCRYPTION_KEY must be set in production for BYOK encryption.");
    }
    if (cachedDevKey) return cachedDevKey;
    const devSeed = `dev:${process.pid}:${process.hrtime.bigint().toString()}`;
    cachedDevKey = scryptSync(devSeed, "byok-salt", 32);
    return cachedDevKey;
  }
  if (seed.length < 24) throw new Error("BYOK secret must be at least 24 characters.");
  return scryptSync(seed, "byok-salt", 32);
}

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getMasterKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", getMasterKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return plain.toString("utf8");
}

interface CacheEntry { plain: string; createdAt: number; }

class ByokService {
  // Write-through cache: { userId -> { provider -> CacheEntry } }
  // Loaded lazily from DB and kept in sync on writes.
  private cache: Map<string, Map<Provider, CacheEntry>> = new Map();
  private loaded: Set<string> = new Set();

  private async load(userId: string): Promise<Map<Provider, CacheEntry>> {
    if (this.loaded.has(userId)) return this.cache.get(userId) ?? new Map();
    const rows = await db.select().from(aiByokKeysTable).where(eq(aiByokKeysTable.userId, userId));
    const bag = new Map<Provider, CacheEntry>();
    for (const row of rows) {
      try {
        bag.set(row.provider as Provider, { plain: decrypt(row.encryptedValue), createdAt: row.createdAt.getTime() });
      } catch {
        // Skip undecryptable rows (likely encrypted with a different secret).
      }
    }
    this.cache.set(userId, bag);
    this.loaded.add(userId);
    return bag;
  }

  async preload(userId: string): Promise<void> { await this.load(userId); }

  async set(userId: string, provider: Provider, rawKey: string): Promise<{ provider: Provider; lastFour: string; createdAt: number }> {
    const enc = encrypt(rawKey);
    await db.insert(aiByokKeysTable).values({ userId, provider, encryptedValue: enc })
      .onConflictDoUpdate({
        target: [aiByokKeysTable.userId, aiByokKeysTable.provider],
        set: { encryptedValue: enc, updatedAt: new Date() },
      });
    const bag = await this.load(userId);
    const entry: CacheEntry = { plain: rawKey, createdAt: Date.now() };
    bag.set(provider, entry);
    return { provider, lastFour: rawKey.slice(-4), createdAt: entry.createdAt };
  }

  // Synchronous read from cache. Callers must preload first (see gateway.ts/routes).
  get(userId: string, provider: Provider): string | null {
    return this.cache.get(userId)?.get(provider)?.plain ?? null;
  }

  has(userId: string, provider: Provider): boolean {
    return !!this.cache.get(userId)?.has(provider);
  }

  async list(userId: string): Promise<Array<{ provider: Provider; lastFour: string; createdAt: number }>> {
    const bag = await this.load(userId);
    return Array.from(bag.entries()).map(([provider, e]) => ({
      provider, lastFour: e.plain.slice(-4), createdAt: e.createdAt,
    }));
  }

  async remove(userId: string, provider: Provider): Promise<boolean> {
    const result = await db.delete(aiByokKeysTable)
      .where(and(eq(aiByokKeysTable.userId, userId), eq(aiByokKeysTable.provider, provider)))
      .returning({ id: aiByokKeysTable.id });
    this.cache.get(userId)?.delete(provider);
    return result.length > 0;
  }
}

export const byokService = new ByokService();
