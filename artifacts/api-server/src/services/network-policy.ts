export interface NetworkPolicy {
  id: string;
  name: string;
  projectId: string;
  enabled: boolean;
  priority: number;
  direction: "ingress" | "egress" | "both";
  action: "allow" | "deny";
  source: string;
  destination: string;
  ports: string[];
  protocol: "tcp" | "udp" | "any";
  createdAt: string;
  updatedAt: string;
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  policies: Omit<NetworkPolicy, "id" | "projectId" | "createdAt" | "updatedAt">[];
}

const policies: NetworkPolicy[] = [
  { id: "np-1", name: "Allow HTTP Ingress", projectId: "proj-1", enabled: true, priority: 100, direction: "ingress", action: "allow", source: "0.0.0.0/0", destination: "app-container", ports: ["80", "443"], protocol: "tcp", createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "np-2", name: "Allow DB Access", projectId: "proj-1", enabled: true, priority: 200, direction: "ingress", action: "allow", source: "app-container", destination: "db-container", ports: ["5432"], protocol: "tcp", createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "np-3", name: "Allow Redis Access", projectId: "proj-1", enabled: true, priority: 300, direction: "ingress", action: "allow", source: "app-container", destination: "redis-container", ports: ["6379"], protocol: "tcp", createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "np-4", name: "Deny External SSH", projectId: "proj-1", enabled: true, priority: 50, direction: "ingress", action: "deny", source: "0.0.0.0/0", destination: "*", ports: ["22"], protocol: "tcp", createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "np-5", name: "Allow DNS Egress", projectId: "proj-1", enabled: true, priority: 100, direction: "egress", action: "allow", source: "*", destination: "0.0.0.0/0", ports: ["53"], protocol: "any", createdAt: new Date(Date.now() - 6 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: "np-6", name: "Restrict Egress", projectId: "proj-1", enabled: false, priority: 999, direction: "egress", action: "deny", source: "*", destination: "0.0.0.0/0", ports: [], protocol: "any", createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];

const templates: PolicyTemplate[] = [
  { id: "tpl-1", name: "Web App Standard", description: "Allow HTTP/HTTPS ingress, database access, DNS egress", policies: [
    { name: "Allow HTTP", enabled: true, priority: 100, direction: "ingress", action: "allow", source: "0.0.0.0/0", destination: "app", ports: ["80", "443"], protocol: "tcp" },
    { name: "Allow DB", enabled: true, priority: 200, direction: "ingress", action: "allow", source: "app", destination: "db", ports: ["5432"], protocol: "tcp" },
    { name: "Allow DNS", enabled: true, priority: 100, direction: "egress", action: "allow", source: "*", destination: "0.0.0.0/0", ports: ["53"], protocol: "any" },
  ]},
  { id: "tpl-2", name: "Strict Isolation", description: "Deny all traffic except explicit allows", policies: [
    { name: "Deny All Ingress", enabled: true, priority: 999, direction: "ingress", action: "deny", source: "0.0.0.0/0", destination: "*", ports: [], protocol: "any" },
    { name: "Deny All Egress", enabled: true, priority: 999, direction: "egress", action: "deny", source: "*", destination: "0.0.0.0/0", ports: [], protocol: "any" },
  ]},
  { id: "tpl-3", name: "Microservices", description: "Allow inter-service communication, restrict external", policies: [
    { name: "Allow Internal", enabled: true, priority: 100, direction: "both", action: "allow", source: "10.0.0.0/8", destination: "10.0.0.0/8", ports: [], protocol: "tcp" },
    { name: "Allow HTTP Ingress", enabled: true, priority: 200, direction: "ingress", action: "allow", source: "0.0.0.0/0", destination: "gateway", ports: ["80", "443"], protocol: "tcp" },
    { name: "Deny Direct Access", enabled: true, priority: 300, direction: "ingress", action: "deny", source: "0.0.0.0/0", destination: "internal-*", ports: [], protocol: "any" },
  ]},
];

export function getPolicies(projectId: string): NetworkPolicy[] { return policies.filter(p => p.projectId === projectId || projectId === "proj-1"); }
export function getTemplates(): PolicyTemplate[] { return templates; }

export function togglePolicy(id: string): NetworkPolicy | null {
  const p = policies.find(x => x.id === id);
  if (!p) return null;
  p.enabled = !p.enabled;
  p.updatedAt = new Date().toISOString();
  return p;
}

export function deletePolicy(id: string): boolean {
  const idx = policies.findIndex(p => p.id === id);
  if (idx === -1) return false;
  policies.splice(idx, 1);
  return true;
}
