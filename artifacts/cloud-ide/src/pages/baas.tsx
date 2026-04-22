import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

export default function BaasPage() {
  const [projectId] = useState("demo-project");
  const [project, setProject] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const [tab, setTab] = useState<"overview" | "database" | "auth" | "storage" | "functions" | "logs">("overview");

  const load = async () => {
    const r = await fetch(api(`/baas/${projectId}`));
    const d = await r.json();
    setInitialized(d.initialized);
    if (d.initialized) setProject(d.project);
  };

  const init = async () => {
    const r = await fetch(api(`/baas/${projectId}/init`), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "my-backend" }),
    });
    setProject(await r.json());
    setInitialized(true);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "database", label: "Database", icon: "🗄️" },
    { id: "auth", label: "Auth", icon: "🔐" },
    { id: "storage", label: "Storage", icon: "📁" },
    { id: "functions", label: "Functions", icon: "⚡" },
    { id: "logs", label: "Logs", icon: "📋" },
  ] as const;

  return (
    <FeaturePageLayout title="Backend as a Service" subtitle="Database, Auth, Storage, and Edge Functions — all in one place" badge="Platform" testId="baas-page">
      <div className="space-y-8">

        {!initialized ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center space-y-6">
            <div className="text-6xl">🚀</div>
            <h2 className="text-2xl font-bold">Set up your backend</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Get a PostgreSQL database, authentication, file storage, and edge functions in seconds.</p>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 max-w-2xl mx-auto">
              {["PostgreSQL DB", "Row-Level Security", "Auth + OAuth", "File Storage", "Edge Functions", "Realtime", "Auto API", "Webhooks", "Backups"].map(f => (
                <div key={f} className="text-xs bg-primary/10 text-primary px-2 py-2 rounded text-center">{f}</div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={load} className="border border-border rounded px-4 py-2 text-sm">Check Status</button>
              <button onClick={init} className="bg-primary text-primary-foreground rounded px-6 py-2 text-sm font-medium">Initialize Backend</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 border-b border-border pb-2">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm rounded-t ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {tab === "overview" && project && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">🗄️ Database</h3>
                  <div className="text-sm text-muted-foreground">Host: {project.database.host}</div>
                  <div className="text-sm text-muted-foreground">Status: <span className="text-green-400">{project.database.status}</span></div>
                  <div className="text-sm text-muted-foreground">Pool: {project.database.connectionPoolSize} connections</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">🔐 Auth</h3>
                  <div className="text-sm text-muted-foreground">Providers: {project.auth.providers.join(", ")}</div>
                  <div className="text-sm text-muted-foreground">Users: {project.auth.userCount}</div>
                  <div className="text-sm text-muted-foreground">MFA: {project.auth.mfaEnabled ? "Enabled" : "Disabled"}</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">📁 Storage</h3>
                  <div className="text-sm text-muted-foreground">Buckets: {project.storage.buckets.length}</div>
                  <div className="text-sm text-muted-foreground">Total: {(project.storage.totalBytes / 1048576).toFixed(1)} MB</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">⚡ Functions</h3>
                  <div className="text-sm text-muted-foreground">Deployed: {project.functions.length}</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">📡 Realtime</h3>
                  <div className="text-sm text-muted-foreground">{project.realtimeEnabled ? "Enabled" : "Disabled"}</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">🔑 API Keys</h3>
                  <div className="text-sm text-muted-foreground">{project.apiKeys.length} keys configured</div>
                  {project.apiKeys.map((k: any) => (
                    <div key={k.name} className="text-xs bg-muted px-2 py-1 rounded">{k.name} ({k.role})</div>
                  ))}
                </div>
              </div>
            )}

            {tab === "database" && (
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">SQL Editor</h2>
                <textarea className="w-full bg-background border border-border rounded p-3 font-mono text-sm h-32" placeholder="SELECT * FROM users LIMIT 10;" />
                <button className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm">Run Query</button>
                <div className="text-xs text-muted-foreground">Row-Level Security | Auto-generated REST API | Real-time subscriptions</div>
              </div>
            )}

            {tab === "auth" && project && (
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">Authentication Providers</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {["email", "google", "github", "gitlab", "apple", "discord", "twitter", "facebook", "linkedin", "azure", "okta", "saml", "phone"].map(p => (
                    <div key={p} className={`border rounded p-3 text-center text-sm cursor-pointer ${project.auth.providers.includes(p) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "storage" && project && (
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">Storage Buckets</h2>
                {project.storage.buckets.map((b: any) => (
                  <div key={b.name} className="border border-border rounded p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.public ? "Public" : "Private"} | Max: {(b.maxFileSize / 1048576).toFixed(0)} MB | Types: {b.allowedMimeTypes.join(", ")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "functions" && (
              <div className="bg-card border border-border rounded-lg p-6 text-center space-y-4">
                <div className="text-4xl">⚡</div>
                <h2 className="text-lg font-semibold">Edge Functions</h2>
                <p className="text-muted-foreground">Deploy serverless functions at the edge with Deno runtime</p>
                <button className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm">Create Function</button>
              </div>
            )}

            {tab === "logs" && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-3">Recent Logs</h2>
                <div className="space-y-2 font-mono text-xs">
                  <div className="text-green-400">[INFO] auth: Backend initialized</div>
                  <div className="text-green-400">[INFO] database: Connection pool ready</div>
                  <div className="text-blue-400">[INFO] storage: Bucket 'public' created</div>
                  <div className="text-blue-400">[INFO] realtime: WebSocket server started</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </FeaturePageLayout>
  );
}
