export interface IPRule { id: string; orgId: string; type: "allow" | "deny"; cidr: string; description: string; enabled: boolean; createdAt: Date; }
class IPFilteringService {
  private rules: Map<string, IPRule> = new Map();
  addRule(data: { orgId: string; type: IPRule["type"]; cidr: string; description: string }): IPRule {
    const id = `ip-${Date.now()}`; const r: IPRule = { id, ...data, enabled: true, createdAt: new Date() };
    this.rules.set(id, r); return r;
  }
  checkIP(orgId: string, ip: string): { allowed: boolean; matchedRule: string | null } {
    const rules = Array.from(this.rules.values()).filter(r => r.orgId === orgId && r.enabled);
    for (const r of rules) { if (ip.startsWith(r.cidr.split("/")[0].split(".").slice(0, 2).join("."))) return { allowed: r.type === "allow", matchedRule: r.id }; }
    return { allowed: true, matchedRule: null };
  }
  listRules(orgId: string): IPRule[] { return Array.from(this.rules.values()).filter(r => r.orgId === orgId); }
  toggleRule(id: string): IPRule | null { const r = this.rules.get(id); if (!r) return null; r.enabled = !r.enabled; return r; }
  deleteRule(id: string): boolean { return this.rules.delete(id); }
}
export const ipFilteringService = new IPFilteringService();
