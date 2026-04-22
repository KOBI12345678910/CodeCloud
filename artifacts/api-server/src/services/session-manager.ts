export interface UserSession { id: string; userId: string; deviceInfo: string; ipAddress: string; location: string; active: boolean; lastActivity: Date; createdAt: Date; expiresAt: Date; }
class SessionManagerService {
  private sessions: Map<string, UserSession> = new Map();
  create(data: { userId: string; deviceInfo: string; ipAddress: string; location?: string }): UserSession {
    const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; const exp = new Date(); exp.setDate(exp.getDate() + 30);
    const s: UserSession = { id, ...data, location: data.location || "Unknown", active: true, lastActivity: new Date(), createdAt: new Date(), expiresAt: exp };
    this.sessions.set(id, s); return s;
  }
  get(id: string): UserSession | null { return this.sessions.get(id) || null; }
  listByUser(userId: string): UserSession[] { return Array.from(this.sessions.values()).filter(s => s.userId === userId); }
  revoke(id: string): boolean { const s = this.sessions.get(id); if (!s) return false; s.active = false; return true; }
  revokeAll(userId: string, exceptId?: string): number { let count = 0; for (const s of this.sessions.values()) { if (s.userId === userId && s.id !== exceptId && s.active) { s.active = false; count++; } } return count; }
  touch(id: string): boolean { const s = this.sessions.get(id); if (!s) return false; s.lastActivity = new Date(); return true; }
}
export const sessionManagerService = new SessionManagerService();
