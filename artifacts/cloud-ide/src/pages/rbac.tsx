import { useState } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
}

const systemRoles: Role[] = [
  { id: "owner", name: "Owner", description: "Full access to everything", permissions: ["*"], userCount: 1, isSystem: true },
  { id: "admin", name: "Admin", description: "Manage org settings, users, billing", permissions: ["org.manage", "users.manage", "billing.manage", "projects.manage", "deploy.manage"], userCount: 2, isSystem: true },
  { id: "developer", name: "Developer", description: "Create and manage projects, deploy", permissions: ["projects.create", "projects.edit", "projects.deploy", "ai.use", "db.query"], userCount: 15, isSystem: true },
  { id: "viewer", name: "Viewer", description: "Read-only access to projects", permissions: ["projects.view", "comments.create"], userCount: 5, isSystem: true },
  { id: "billing", name: "Billing Admin", description: "Manage billing and subscriptions", permissions: ["billing.manage", "billing.view", "invoices.view"], userCount: 1, isSystem: true },
];

const allPermissions = [
  { group: "Organization", perms: ["org.manage", "org.view", "org.settings"] },
  { group: "Users", perms: ["users.manage", "users.invite", "users.remove", "users.view"] },
  { group: "Projects", perms: ["projects.create", "projects.edit", "projects.delete", "projects.view", "projects.manage"] },
  { group: "Deployments", perms: ["deploy.manage", "deploy.create", "deploy.rollback", "deploy.view"] },
  { group: "Database", perms: ["db.query", "db.manage", "db.backup", "db.view"] },
  { group: "AI", perms: ["ai.use", "ai.configure", "ai.models"] },
  { group: "Billing", perms: ["billing.manage", "billing.view", "invoices.view"] },
  { group: "Security", perms: ["security.manage", "security.view", "audit.view"] },
  { group: "Integrations", perms: ["integrations.manage", "integrations.view"] },
];

export default function RbacPage() {
  const [roles, setRoles] = useState<Role[]>(systemRoles);
  const [selected, setSelected] = useState<Role | null>(null);
  const [tab, setTab] = useState<"roles" | "permissions" | "audit">("roles");
  const [newRole, setNewRole] = useState({ name: "", description: "", permissions: [] as string[] });

  const addRole = () => {
    if (!newRole.name) return;
    setRoles([...roles, { id: `custom_${Date.now()}`, ...newRole, userCount: 0, isSystem: false }]);
    setNewRole({ name: "", description: "", permissions: [] });
  };

  const togglePerm = (perm: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Access Control (RBAC)</h1>
          <p className="text-muted-foreground mt-1">Manage roles, permissions, and access policies for your organization</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Roles", value: roles.length, color: "text-purple-400" },
            { label: "System Roles", value: roles.filter(r => r.isSystem).length, color: "text-blue-400" },
            { label: "Custom Roles", value: roles.filter(r => !r.isSystem).length, color: "text-green-400" },
            { label: "Total Users", value: roles.reduce((s, r) => s + r.userCount, 0), color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-b border-border pb-2">
          {(["roles", "permissions", "audit"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground rounded" : "text-muted-foreground"}`}>{t}</button>
          ))}
        </div>

        {tab === "roles" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {roles.map(r => (
                <div key={r.id} onClick={() => setSelected(r)} className={`bg-card border rounded-lg p-4 cursor-pointer transition ${selected?.id === r.id ? "border-primary" : "border-border hover:border-primary/50"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{r.name}</span>
                      {r.isSystem && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">System</span>}
                    </div>
                    <span className="text-sm text-muted-foreground">{r.userCount} users</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.permissions.slice(0, 5).map(p => (
                      <span key={p} className="text-xs bg-muted px-2 py-0.5 rounded">{p}</span>
                    ))}
                    {r.permissions.length > 5 && <span className="text-xs text-muted-foreground">+{r.permissions.length - 5} more</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Create Custom Role</h2>
              <input className="w-full bg-background border border-border rounded px-3 py-2 text-sm" placeholder="Role name" value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} />
              <input className="w-full bg-background border border-border rounded px-3 py-2 text-sm" placeholder="Description" value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} />
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {allPermissions.map(g => (
                  <div key={g.group}>
                    <div className="text-xs font-medium text-muted-foreground mb-1">{g.group}</div>
                    <div className="flex flex-wrap gap-1">
                      {g.perms.map(p => (
                        <span key={p} onClick={() => togglePerm(p)} className={`text-xs px-2 py-1 rounded cursor-pointer ${newRole.permissions.includes(p) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/20"}`}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addRole} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm w-full">Create Role</button>
            </div>
          </div>
        )}

        {tab === "permissions" && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Permission Matrix</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2">Permission</th>
                    {roles.map(r => <th key={r.id} className="text-center p-2 text-xs">{r.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {allPermissions.flatMap(g => g.perms.map(p => (
                    <tr key={p} className="border-b border-border/50">
                      <td className="p-2 font-mono text-xs">{p}</td>
                      {roles.map(r => (
                        <td key={r.id} className="text-center p-2">
                          {r.permissions.includes("*") || r.permissions.includes(p) ? <span className="text-green-400">&#10003;</span> : <span className="text-gray-600">-</span>}
                        </td>
                      ))}
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "audit" && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            <h2 className="text-lg font-semibold">Recent Access Changes</h2>
            {[
              { action: "Role assigned", user: "john@example.com", detail: 'Assigned "Developer" role', time: "2 hours ago" },
              { action: "Permission added", user: "admin@example.com", detail: 'Added deploy.manage to "Developer"', time: "1 day ago" },
              { action: "User invited", user: "sarah@example.com", detail: 'Invited as "Viewer"', time: "3 days ago" },
              { action: "Role created", user: "admin@example.com", detail: 'Created custom role "QA Engineer"', time: "1 week ago" },
            ].map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <span className="font-medium text-sm">{e.action}</span>
                  <span className="text-muted-foreground text-sm ml-2">{e.detail}</span>
                </div>
                <span className="text-xs text-muted-foreground">{e.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
