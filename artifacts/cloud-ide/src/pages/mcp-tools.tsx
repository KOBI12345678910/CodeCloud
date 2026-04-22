import { useState, useEffect } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

export default function McpToolsPage() {
  const [projectId] = useState("demo-project");
  const [servers, setServers] = useState<any[]>([]);
  const [allTools, setAllTools] = useState<any[]>([]);
  const [tab, setTab] = useState<"servers" | "tools">("servers");
  const [newServer, setNewServer] = useState({ name: "", url: "", transport: "sse" });

  const load = async () => {
    const [sr, tr] = await Promise.all([
      fetch(api(`/mcp/${projectId}/servers`)),
      fetch(api(`/mcp/${projectId}/tools`)),
    ]);
    setServers((await sr.json()).servers || []);
    setAllTools((await tr.json()).tools || []);
  };

  useEffect(() => { load(); }, []);

  const addServer = async () => {
    if (!newServer.name || !newServer.url) return;
    await fetch(api(`/mcp/${projectId}/servers`), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newServer),
    });
    setNewServer({ name: "", url: "", transport: "sse" });
    load();
  };

  return (
    <FeaturePageLayout title="MCP Tool Integration" subtitle="Model Context Protocol — connect external tools to the AI agent" badge="AI" testId="mcp-tools-page">
      <div className="space-y-8">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "MCP Servers", value: servers.length, icon: "🔌" },
            { label: "Built-in", value: servers.filter(s => s.id.startsWith("builtin")).length, icon: "🏗️" },
            { label: "Custom", value: servers.filter(s => !s.id.startsWith("builtin")).length, icon: "🔧" },
            { label: "Total Tools", value: allTools.length, icon: "🛠️" },
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

        <div className="flex gap-2 border-b border-border pb-2">
          <button onClick={() => setTab("servers")} className={`px-4 py-2 text-sm ${tab === "servers" ? "bg-primary text-primary-foreground rounded" : "text-muted-foreground"}`}>Servers</button>
          <button onClick={() => setTab("tools")} className={`px-4 py-2 text-sm ${tab === "tools" ? "bg-primary text-primary-foreground rounded" : "text-muted-foreground"}`}>All Tools</button>
        </div>

        {tab === "servers" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Add Custom MCP Server</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input className="bg-background border border-border rounded px-3 py-2 text-sm" placeholder="Server name" value={newServer.name} onChange={e => setNewServer({ ...newServer, name: e.target.value })} />
                <input className="bg-background border border-border rounded px-3 py-2 text-sm" placeholder="URL (e.g. http://localhost:3001)" value={newServer.url} onChange={e => setNewServer({ ...newServer, url: e.target.value })} />
                <select className="bg-background border border-border rounded px-3 py-2 text-sm" value={newServer.transport} onChange={e => setNewServer({ ...newServer, transport: e.target.value })}>
                  <option value="sse">SSE</option><option value="stdio">Stdio</option><option value="http">HTTP</option>
                </select>
                <button onClick={addServer} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium">Connect</button>
              </div>
            </div>

            {servers.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.status === "connected" ? "bg-green-400" : "bg-red-400"}`} />
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{s.transport}</span>
                    {s.id.startsWith("builtin") && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Built-in</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{s.tools?.length || 0} tools | {s.resources?.length || 0} resources</span>
                </div>
                {s.tools?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {s.tools.map((t: any) => (
                      <span key={t.name} className={`text-xs px-2 py-1 rounded ${t.enabled ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-muted text-muted-foreground"}`}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "tools" && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Tool</th>
                  <th className="text-left p-3">Server</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Source</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {allTools.map((t, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{t.name}</td>
                    <td className="p-3">{t.server}</td>
                    <td className="p-3 text-muted-foreground">{t.description}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${t.source === "builtin" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>{t.source}</span></td>
                    <td className="p-3"><span className={`text-xs ${t.enabled ? "text-green-400" : "text-gray-500"}`}>{t.enabled ? "Enabled" : "Disabled"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FeaturePageLayout>
  );
}
