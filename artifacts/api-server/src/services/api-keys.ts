export interface ApiKey { id: string; userId: string; name: string; keyPrefix: string; permissions: string[]; rateLimit: number; lastUsed: Date | null; expiresAt: Date | null; active: boolean; createdAt: Date; }
class ApiKeysService {
  private keys: Map<string, ApiKey> = new Map();
  create(data: { userId: string; name: string; permissions?: string[]; rateLimit?: number; expiresAt?: Date }): { key: ApiKey; rawKey: string } {
    const id = `ak-${Date.now()}`; const rawKey = `cc_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    const key: ApiKey = { id, userId: data.userId, name: data.name, keyPrefix: rawKey.slice(0, 8), permissions: data.permissions || ["read", "write"], rateLimit: data.rateLimit || 1000, lastUsed: null, expiresAt: data.expiresAt || null, active: true, createdAt: new Date() };
    this.keys.set(id, key); return { key, rawKey };
  }
  revoke(id: string): boolean { const k = this.keys.get(id); if (!k) return false; k.active = false; return true; }
  get(id: string): ApiKey | null { return this.keys.get(id) || null; }
  listByUser(userId: string): ApiKey[] { return Array.from(this.keys.values()).filter(k => k.userId === userId); }
  delete(id: string): boolean { return this.keys.delete(id); }
}
export const apiKeysService = new ApiKeysService();
