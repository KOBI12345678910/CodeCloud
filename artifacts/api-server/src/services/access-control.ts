export interface Permission { resource: string; action: "read" | "write" | "delete" | "admin"; }
export interface Role { name: string; permissions: Permission[]; }
export interface AccessPolicy { id: string; projectId: string; userId: string; role: string; grantedBy: string; grantedAt: Date; }
class AccessControlService {
  private roles: Map<string, Role> = new Map([
    ["owner", { name: "owner", permissions: [{ resource: "*", action: "admin" }] }],
    ["admin", { name: "admin", permissions: [{ resource: "*", action: "read" }, { resource: "*", action: "write" }, { resource: "settings", action: "admin" }] }],
    ["editor", { name: "editor", permissions: [{ resource: "files", action: "read" }, { resource: "files", action: "write" }, { resource: "terminal", action: "read" }] }],
    ["viewer", { name: "viewer", permissions: [{ resource: "files", action: "read" }] }],
  ]);
  private policies: AccessPolicy[] = [];
  grantAccess(projectId: string, userId: string, role: string, grantedBy: string): AccessPolicy {
    const p: AccessPolicy = { id: `acl-${Date.now()}`, projectId, userId, role, grantedBy, grantedAt: new Date() };
    this.policies.push(p); return p;
  }
  revokeAccess(projectId: string, userId: string): boolean { const len = this.policies.length; this.policies = this.policies.filter(p => !(p.projectId === projectId && p.userId === userId)); return this.policies.length < len; }
  checkAccess(projectId: string, userId: string, resource: string, action: Permission["action"]): boolean {
    const policy = this.policies.find(p => p.projectId === projectId && p.userId === userId); if (!policy) return false;
    const role = this.roles.get(policy.role); if (!role) return false;
    return role.permissions.some(p => (p.resource === "*" || p.resource === resource) && (p.action === "admin" || p.action === action));
  }
  getPolicies(projectId: string): AccessPolicy[] { return this.policies.filter(p => p.projectId === projectId); }
  getRoles(): Role[] { return Array.from(this.roles.values()); }
  getUserRole(projectId: string, userId: string): string | null { return this.policies.find(p => p.projectId === projectId && p.userId === userId)?.role || null; }
}
export const accessControlService = new AccessControlService();
