export interface CustomDomain { id: string; projectId: string; domain: string; status: "pending" | "verified" | "active" | "error"; sslStatus: "none" | "provisioning" | "active"; dnsRecords: { type: string; name: string; value: string }[]; createdAt: Date; }
class DomainManagementService {
  private domains: Map<string, CustomDomain> = new Map();
  add(projectId: string, domain: string): CustomDomain {
    const id = `dom-${Date.now()}`; const d: CustomDomain = { id, projectId, domain, status: "pending", sslStatus: "none", dnsRecords: [{ type: "CNAME", name: domain, value: "codecloud.app" }, { type: "TXT", name: `_verify.${domain}`, value: `codecloud-verify=${id}` }], createdAt: new Date() };
    this.domains.set(id, d); return d;
  }
  verify(id: string): CustomDomain | null { const d = this.domains.get(id); if (!d) return null; d.status = "verified"; d.sslStatus = "provisioning"; return d; }
  activate(id: string): CustomDomain | null { const d = this.domains.get(id); if (!d) return null; d.status = "active"; d.sslStatus = "active"; return d; }
  get(id: string): CustomDomain | null { return this.domains.get(id) || null; }
  listByProject(projectId: string): CustomDomain[] { return Array.from(this.domains.values()).filter(d => d.projectId === projectId); }
  delete(id: string): boolean { return this.domains.delete(id); }
}
export const domainManagementService = new DomainManagementService();
