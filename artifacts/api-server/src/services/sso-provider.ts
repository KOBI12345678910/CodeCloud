export interface SSOProvider { id: string; orgId: string; provider: "saml" | "oidc" | "google" | "github" | "okta"; entityId: string; loginUrl: string; certificate: string; enabled: boolean; createdAt: Date; }
export interface SSOSession { id: string; userId: string; providerId: string; email: string; attributes: Record<string, string>; expiresAt: Date; createdAt: Date; }
class SSOProviderService {
  private providers: Map<string, SSOProvider> = new Map();
  private sessions: SSOSession[] = [];
  configure(data: { orgId: string; provider: SSOProvider["provider"]; entityId: string; loginUrl: string; certificate: string }): SSOProvider {
    const id = `sso-${Date.now()}`; const p: SSOProvider = { id, ...data, enabled: true, createdAt: new Date() };
    this.providers.set(id, p); return p;
  }
  initiateLogin(providerId: string, email: string): SSOSession | null {
    const p = this.providers.get(providerId); if (!p || !p.enabled) return null;
    const exp = new Date(); exp.setHours(exp.getHours() + 8);
    const s: SSOSession = { id: `ssosess-${Date.now()}`, userId: `user-${Math.random().toString(36).slice(2, 8)}`, providerId, email, attributes: {}, expiresAt: exp, createdAt: new Date() };
    this.sessions.push(s); return s;
  }
  get(id: string): SSOProvider | null { return this.providers.get(id) || null; }
  listByOrg(orgId: string): SSOProvider[] { return Array.from(this.providers.values()).filter(p => p.orgId === orgId); }
  toggle(id: string): SSOProvider | null { const p = this.providers.get(id); if (!p) return null; p.enabled = !p.enabled; return p; }
  delete(id: string): boolean { return this.providers.delete(id); }
}
export const ssoProviderService = new SSOProviderService();
