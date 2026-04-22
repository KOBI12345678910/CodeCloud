import { useState, useEffect } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

export default function KnowledgeBasePage() {
  const [projectId] = useState("demo-project");
  const [docs, setDocs] = useState<any[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [tab, setTab] = useState<"documents" | "add" | "import">("documents");
  const [form, setForm] = useState({ title: "", content: "", category: "context", priority: 0 });
  const [importUrl, setImportUrl] = useState("");

  const load = async () => {
    const r = await fetch(api(`/knowledge/${projectId}`));
    const d = await r.json();
    setDocs(d.documents || []);
    setTotalTokens(d.totalTokens || 0);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.title || !form.content) return;
    await fetch(api(`/knowledge/${projectId}`), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ title: "", content: "", category: "context", priority: 0 });
    load();
  };

  const importFromUrl = async () => {
    if (!importUrl) return;
    await fetch(api(`/knowledge/${projectId}/import-url`), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: importUrl }),
    });
    setImportUrl("");
    load();
  };

  const remove = async (id: string) => {
    await fetch(api(`/knowledge/${projectId}/${id}`), { method: "DELETE" });
    load();
  };

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(api(`/knowledge/${projectId}/${id}`), {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    load();
  };

  const categories = ["context", "rules", "api-docs", "style-guide", "architecture", "custom"];
  const usagePercent = Math.round((totalTokens / 100000) * 100);

  return (
    <FeaturePageLayout title="Knowledge Base" subtitle="Give the AI agent custom context — docs, rules, API references, and more" badge="AI" testId="knowledge-base-page">
      <div className="space-y-8">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{docs.length}</div>
            <div className="text-sm text-muted-foreground">Documents</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{docs.filter(d => d.enabled).length}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className={`text-2xl font-bold ${usagePercent > 80 ? "text-red-400" : "text-purple-400"}`}>{totalTokens.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Tokens ({usagePercent}% used)</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">100K</div>
            <div className="text-sm text-muted-foreground">Token Limit</div>
          </div>
        </div>

        <div className="w-full bg-muted rounded-full h-2">
          <div className={`h-2 rounded-full ${usagePercent > 80 ? "bg-red-500" : "bg-primary"}`} style={{ width: `${Math.min(usagePercent, 100)}%` }} />
        </div>

        <div className="flex gap-2 border-b border-border pb-2">
          {(["documents", "add", "import"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground rounded" : "text-muted-foreground"}`}>{t === "add" ? "Add Document" : t === "import" ? "Import URL" : t}</button>
          ))}
        </div>

        {tab === "documents" && (
          <div className="space-y-3">
            {docs.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center space-y-3">
                <div className="text-4xl">📚</div>
                <h2 className="text-lg font-semibold">No documents yet</h2>
                <p className="text-muted-foreground text-sm">Add custom context to help the AI understand your project better</p>
                <button onClick={() => setTab("add")} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm">Add First Document</button>
              </div>
            ) : docs.map(d => (
              <div key={d.id} className={`bg-card border rounded-lg p-4 ${d.enabled ? "border-border" : "border-border opacity-50"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${d.enabled ? "bg-green-400" : "bg-gray-500"}`} />
                    <span className="font-semibold">{d.title}</span>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{d.category}</span>
                    {d.format === "url" && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">URL</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{d.tokens} tokens</span>
                    <button onClick={() => toggle(d.id, d.enabled)} className="text-xs px-2 py-1 rounded bg-muted hover:bg-primary/20">{d.enabled ? "Disable" : "Enable"}</button>
                    <button onClick={() => remove(d.id)} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">Delete</button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{d.content}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "add" && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Add Knowledge Document</h2>
            <input className="w-full bg-background border border-border rounded px-3 py-2 text-sm" placeholder="Document title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <select className="w-full bg-background border border-border rounded px-3 py-2 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {categories.map(c => <option key={c} value={c}>{c.replace("-", " ").replace(/^\w/, ch => ch.toUpperCase())}</option>)}
            </select>
            <textarea className="w-full bg-background border border-border rounded px-3 py-2 text-sm h-48 font-mono" placeholder="Document content (Markdown supported)" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">~{Math.ceil((form.content.length || 0) / 4)} tokens</span>
              <button onClick={add} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm">Add Document</button>
            </div>
          </div>
        )}

        {tab === "import" && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Import from URL</h2>
            <p className="text-sm text-muted-foreground">Import API docs, README files, or any web content as context</p>
            <input className="w-full bg-background border border-border rounded px-3 py-2 text-sm" placeholder="https://docs.example.com/api" value={importUrl} onChange={e => setImportUrl(e.target.value)} />
            <button onClick={importFromUrl} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm">Import</button>
          </div>
        )}
      </div>
    </FeaturePageLayout>
  );
}
