import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

export default function StaticDeployPage() {
  const [projectId] = useState("demo-project");
  const [deploys, setDeploys] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", framework: "react", buildCommand: "npm run build", outputDir: "dist" });

  const load = async () => {
    const r = await fetch(api(`/static-deploy/${projectId}`));
    setDeploys((await r.json()).deployments || []);
  };

  const create = async () => {
    await fetch(api(`/static-deploy/${projectId}`), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ ...form, name: "" });
    load();
  };

  const redeploy = async (id: string) => {
    await fetch(api(`/static-deploy/${projectId}/${id}/redeploy`), { method: "POST" });
    load();
  };

  const frameworks = ["react", "vue", "svelte", "next", "nuxt", "astro", "vanilla", "angular", "hugo", "gatsby"];

  return (
    <FeaturePageLayout title="Static Deployments" subtitle="Deploy static sites with global CDN, custom domains, and instant rollbacks" badge="Deployments" testId="static-deploy-page">
      <div className="space-y-8">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Total Deployments", value: deploys.length, icon: "🌐" },
            { label: "Active", value: deploys.filter(d => d.status === "deployed").length, icon: "✅" },
            { label: "CDN Regions", value: 3, icon: "🗺️" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Deploy Static Site</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="bg-background border border-border rounded px-3 py-2 text-sm" placeholder="Site name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select className="bg-background border border-border rounded px-3 py-2 text-sm" value={form.framework} onChange={e => setForm({ ...form, framework: e.target.value })}>
              {frameworks.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
            <input className="bg-background border border-border rounded px-3 py-2 text-sm" placeholder="Build command" value={form.buildCommand} onChange={e => setForm({ ...form, buildCommand: e.target.value })} />
            <button onClick={create} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium">Deploy</button>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {frameworks.map(f => (
              <span key={f} className={`text-xs px-2 py-1 rounded cursor-pointer ${form.framework === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} onClick={() => setForm({ ...form, framework: f })}>
                {f}
              </span>
            ))}
          </div>
        </div>

        <button onClick={load} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm">Load Deployments</button>

        {deploys.map(d => (
          <div key={d.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${d.status === "deployed" ? "bg-green-400" : d.status === "building" ? "bg-yellow-400 animate-pulse" : "bg-red-400"}`} />
                <span className="font-semibold">{d.name}</span>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{d.framework}</span>
              </div>
              <button onClick={() => redeploy(d.id)} className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded">Redeploy</button>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {d.url && <div>URL: <a href={d.url} className="text-primary">{d.url}</a></div>}
              <div>Build: {d.buildCommand} | Output: {d.outputDir}</div>
              {d.buildDurationMs && <div>Build time: {(d.buildDurationMs / 1000).toFixed(1)}s | Size: {d.sizeBytes ? (d.sizeBytes / 1048576).toFixed(1) + " MB" : "..."}</div>}
              <div>CDN: {d.cdn?.regions?.join(", ")} | SPA: {d.spaFallback ? "Yes" : "No"} | Clean URLs: {d.cleanUrls ? "Yes" : "No"}</div>
            </div>
          </div>
        ))}

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {["Global CDN (3 regions)", "Custom domains + SSL", "SPA fallback", "Clean URLs", "Custom redirects", "Custom headers", "Cache invalidation", "Instant rollbacks", "Environment variables", "Build previews"].map(f => (
              <div key={f} className="flex items-center gap-2"><span className="text-green-400">&#10003;</span>{f}</div>
            ))}
          </div>
        </div>
      </div>
    </FeaturePageLayout>
  );
}
