import { useState, useEffect } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

export default function PublishingControlsPage() {
  const [projectId] = useState("demo-project");
  const [config, setConfig] = useState<any>(null);

  const load = async () => {
    const r = await fetch(api(`/publishing/${projectId}`));
    setConfig(await r.json());
  };

  useEffect(() => { load(); }, []);

  const update = async (changes: any) => {
    const r = await fetch(api(`/publishing/${projectId}`), {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    setConfig(await r.json());
  };

  const publish = async () => {
    const r = await fetch(api(`/publishing/${projectId}/publish`), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ environment: "production", changelog: "New release", approvedBy: "admin" }),
    });
    if (r.ok) load();
  };

  if (!config) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Publishing Controls</h1>
            <p className="text-muted-foreground mt-1">Configure deployment pipelines, approvals, and rollback policies</p>
          </div>
          <button onClick={publish} className="bg-green-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-green-700">Publish Now</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">Approval Workflow</h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Require approval</span>
              <input type="checkbox" checked={config.approvalRequired} onChange={e => update({ approvalRequired: e.target.checked })} className="rounded" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Auto-publish</span>
              <input type="checkbox" checked={config.autoPublish} onChange={e => update({ autoPublish: e.target.checked })} className="rounded" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Publish on merge</span>
              <input type="checkbox" checked={config.publishOnMerge} onChange={e => update({ publishOnMerge: e.target.checked })} className="rounded" />
            </label>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">Rollback</h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Enable rollback</span>
              <input type="checkbox" checked={config.rollbackEnabled} onChange={e => update({ rollbackEnabled: e.target.checked })} className="rounded" />
            </label>
            <div className="text-sm text-muted-foreground">Max versions: {config.maxRollbackVersions}</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">Badge</h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Remove "Powered by" badge</span>
              <input type="checkbox" checked={config.badges?.removePoweredBy} onChange={e => update({ badges: { ...config.badges, removePoweredBy: e.target.checked } })} className="rounded" />
            </label>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Environments</h2>
          <div className="space-y-3">
            {config.environments?.map((env: any, i: number) => (
              <div key={i} className="border border-border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${env.status === "active" ? "bg-green-400" : "bg-gray-500"}`} />
                  <div>
                    <div className="font-medium">{env.name}</div>
                    <div className="text-xs text-muted-foreground">Branch: {env.branch} | Auto-promote: {env.autoPromote ? "Yes" : "No"}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${env.status === "active" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>{env.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Pre-Publish Checks</h2>
          <div className="space-y-2">
            {config.prePublishChecks?.map((check: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={check.enabled} readOnly className="rounded" />
                  <div>
                    <span className="text-sm font-medium">{check.name}</span>
                    {check.required && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded ml-2">Required</span>}
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{check.command}</span>
              </div>
            ))}
          </div>
        </div>

        {config.publishHistory?.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Publish History</h2>
            <div className="space-y-2">
              {config.publishHistory.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${h.status === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>{h.status}</span>
                    <span className="font-medium text-sm">{h.version}</span>
                    <span className="text-xs text-muted-foreground">{h.environment}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(h.publishedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
