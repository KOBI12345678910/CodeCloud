import { useState, useEffect } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

export default function SharingPage() {
  const [projectId] = useState("demo-project");
  const [config, setConfig] = useState<any>(null);

  const load = async () => {
    const r = await fetch(api(`/sharing/${projectId}`));
    setConfig(await r.json());
  };

  useEffect(() => { load(); }, []);

  const update = async (changes: any) => {
    const r = await fetch(api(`/sharing/${projectId}`), {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    setConfig(await r.json());
  };

  const generateLink = async () => {
    await update({ visibility: config?.visibility || "private" });
    const r = await fetch(api(`/sharing/${projectId}/generate-link`), { method: "POST" });
    const d = await r.json();
    if (d.shareLink) setConfig((prev: any) => ({ ...prev, shareLink: d.shareLink, shareLinkEnabled: true }));
  };

  const visibilityOptions = [
    { value: "public", label: "Public", desc: "Visible to everyone, indexed by search engines", icon: "🌍" },
    { value: "unlisted", label: "Unlisted", desc: "Accessible via link only, not indexed", icon: "🔗" },
    { value: "internal", label: "Internal", desc: "Visible only to organization members", icon: "🏢" },
    { value: "private", label: "Private", desc: "Visible only to invited collaborators", icon: "🔒" },
  ];

  if (!config) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Sharing & Visibility</h1>
          <p className="text-muted-foreground mt-1">Control who can see, fork, and embed your project</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Visibility</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibilityOptions.map(v => (
              <div key={v.value} onClick={() => update({ visibility: v.value })} className={`border rounded-lg p-4 cursor-pointer transition ${config.visibility === v.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{v.icon}</span>
                  <span className="font-medium">{v.label}</span>
                  {config.visibility === v.value && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded ml-auto">Active</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Share Link</h2>
          {config.shareLink ? (
            <div className="flex items-center gap-2">
              <input className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono" value={config.shareLink} readOnly />
              <button onClick={() => navigator.clipboard.writeText(config.shareLink)} className="bg-primary text-primary-foreground rounded px-3 py-2 text-sm">Copy</button>
            </div>
          ) : (
            <button onClick={generateLink} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm">Generate Share Link</button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            <h2 className="text-lg font-semibold">Permissions</h2>
            {[
              { label: "Allow forking", key: "forkingAllowed" },
              { label: "Allow downloads", key: "downloadAllowed" },
              { label: "Allow commenting", key: "commentingAllowed" },
              { label: "Show in Explore", key: "showInExplore" },
              { label: "Search engine indexing", key: "indexable" },
              { label: "Require approval for access", key: "requireApproval" },
            ].map(p => (
              <label key={p.key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">{p.label}</span>
                <input type="checkbox" checked={config[p.key]} onChange={e => update({ [p.key]: e.target.checked })} className="rounded" />
              </label>
            ))}
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            <h2 className="text-lg font-semibold">Embed</h2>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Enable embedding</span>
              <input type="checkbox" checked={config.embedEnabled} onChange={e => update({ embedEnabled: e.target.checked })} className="rounded" />
            </label>
            {config.embedEnabled && (
              <div className="space-y-2 mt-3">
                <div className="text-xs text-muted-foreground font-mono bg-muted p-3 rounded overflow-x-auto">
                  {`<iframe src="https://codecloud.app/embed/${projectId}" width="100%" height="600" />`}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-3">
          <h2 className="text-lg font-semibold">Social Sharing</h2>
          <input className="w-full bg-background border border-border rounded px-3 py-2 text-sm" placeholder="Custom title for social cards" value={config.socialSharing?.title || ""} onChange={e => update({ socialSharing: { ...config.socialSharing, title: e.target.value } })} />
          <textarea className="w-full bg-background border border-border rounded px-3 py-2 text-sm h-20" placeholder="Custom description" value={config.socialSharing?.description || ""} onChange={e => update({ socialSharing: { ...config.socialSharing, description: e.target.value } })} />
        </div>
      </div>
    </div>
  );
}
