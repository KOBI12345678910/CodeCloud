export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: "active" | "suspended" | "provisioning";
  config: TenantConfig;
  stats: { users: number; projects: number; storage: number };
  createdAt: string;
}

export interface TenantConfig {
  maxUsers: number;
  maxProjects: number;
  maxStorage: number;
  customDomain?: string;
  features: string[];
  dataRegion: string;
}

export function listTenants(): Tenant[] {
  return [
    { id: "t1", name: "Acme Corp", slug: "acme", plan: "team", status: "active", config: { maxUsers: 50, maxProjects: 100, maxStorage: 50000, customDomain: "ide.acme.com", features: ["sso", "audit", "priority-support"], dataRegion: "us-east" }, stats: { users: 32, projects: 67, storage: 28000 }, createdAt: new Date(Date.now() - 180 * 86400000).toISOString() },
    { id: "t2", name: "Beta Labs", slug: "betalabs", plan: "pro", status: "active", config: { maxUsers: 10, maxProjects: 25, maxStorage: 10000, features: ["sso"], dataRegion: "eu-west" }, stats: { users: 8, projects: 15, storage: 5200 }, createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
    { id: "t3", name: "NewCo", slug: "newco", plan: "free", status: "provisioning", config: { maxUsers: 3, maxProjects: 5, maxStorage: 1000, features: [], dataRegion: "us-east" }, stats: { users: 1, projects: 0, storage: 0 }, createdAt: new Date().toISOString() },
  ];
}

export function provisionTenant(name: string, plan: string): Tenant {
  return { id: crypto.randomUUID(), name, slug: name.toLowerCase().replace(/\s+/g, "-"), plan, status: "provisioning", config: { maxUsers: plan === "team" ? 50 : 10, maxProjects: plan === "team" ? 100 : 25, maxStorage: plan === "team" ? 50000 : 10000, features: plan === "team" ? ["sso", "audit"] : [], dataRegion: "us-east" }, stats: { users: 0, projects: 0, storage: 0 }, createdAt: new Date().toISOString() };
}
