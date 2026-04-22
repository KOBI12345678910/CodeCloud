import { useState } from "react";
import { X, Play, Loader2, CheckCircle2, XCircle, FileCode, Download, Plus, Trash2 } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

interface RouteEntry { method: string; path: string; description: string; }

export function ApiTestRunner({ projectId, onClose }: Props) {
  const [routes, setRoutes] = useState<RouteEntry[]>([
    { method: "GET", path: "/api/health", description: "Health check" },
    { method: "GET", path: "/api/projects", description: "List projects" },
    { method: "POST", path: "/api/projects", description: "Create project" },
  ]);
  const [tests, setTests] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"setup" | "results">("setup");

  const generateTests = async () => {
    try {
      const res = await fetch(`${API}/projects/${projectId}/api-tests/generate`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ routes }) });
      if (res.ok) { const t = await res.json(); setTests(t); }
    } catch {}
  };

  const runTests = async () => {
    setLoading(true);
    try {
      if (tests.length === 0) await generateTests();
      const res = await fetch(`${API}/projects/${projectId}/api-tests/run`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tests: tests.length > 0 ? tests : routes.map(r => ({ id: crypto.randomUUID(), name: `${r.method} ${r.path}`, method: r.method, path: r.path, expectedStatus: r.method === "POST" ? 201 : 200, assertions: [] })) }) });
      if (res.ok) { setResult(await res.json()); setTab("results"); }
    } catch {} finally { setLoading(false); }
  };

  const addRoute = () => setRoutes([...routes, { method: "GET", path: "/api/", description: "" }]);
  const removeRoute = (i: number) => setRoutes(routes.filter((_, idx) => idx !== i));
  const updateRoute = (i: number, field: keyof RouteEntry, value: string) => { const nr = [...routes]; nr[i] = { ...nr[i], [field]: value }; setRoutes(nr); };

  const downloadSnapshot = async () => {
    try {
      const res = await fetch(`${API}/projects/${projectId}/api-tests/snapshot`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ responses: routes.map(r => ({ path: r.path, method: r.method, body: { success: true } })) }) });
      if (res.ok) { const { code } = await res.json(); const blob = new Blob([code], { type: "text/typescript" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "api-tests.test.ts"; a.click(); URL.revokeObjectURL(url); }
    } catch {}
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="api-test-runner">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><FileCode className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">API Test Runner</span></div>
        <div className="flex items-center gap-1">
          <button onClick={downloadSnapshot} className="flex items-center gap-1 px-2 py-0.5 text-[10px] border border-border rounded hover:bg-muted"><Download className="w-2.5 h-2.5" /> Export</button>
          <button onClick={runTests} disabled={loading} className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-primary text-primary-foreground rounded disabled:opacity-50">{loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />} Run</button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex border-b border-border/30 shrink-0">
        <button onClick={() => setTab("setup")} className={`px-3 py-1 text-[11px] border-b-2 ${tab === "setup" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Setup</button>
        <button onClick={() => setTab("results")} className={`px-3 py-1 text-[11px] border-b-2 ${tab === "results" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Results {result && <span className="ml-1 text-[9px]">({result.passed}/{result.totalTests})</span>}</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "setup" && (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">API Routes to Test</div>
              <button onClick={addRoute} className="flex items-center gap-1 text-[10px] text-primary"><Plus className="w-2.5 h-2.5" /> Add</button>
            </div>
            {routes.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <select value={r.method} onChange={e => updateRoute(i, "method", e.target.value)} className="bg-muted/50 border border-border/50 rounded px-1 py-0.5 text-[10px] w-16">
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input value={r.path} onChange={e => updateRoute(i, "path", e.target.value)} className="flex-1 bg-muted/50 border border-border/50 rounded px-1.5 py-0.5 text-[10px] font-mono" placeholder="/api/..." />
                <input value={r.description} onChange={e => updateRoute(i, "description", e.target.value)} className="flex-1 bg-muted/50 border border-border/50 rounded px-1.5 py-0.5 text-[10px]" placeholder="Description" />
                <button onClick={() => removeRoute(i)} className="p-0.5 text-muted-foreground hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
              </div>
            ))}
          </div>
        )}
        {tab === "results" && result && (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-card/50 rounded p-2 border border-border/30 text-center"><div className="text-lg font-bold">{result.totalTests}</div><div className="text-[10px] text-muted-foreground">Total</div></div>
              <div className="bg-green-400/5 rounded p-2 border border-green-400/20 text-center"><div className="text-lg font-bold text-green-400">{result.passed}</div><div className="text-[10px] text-muted-foreground">Passed</div></div>
              <div className="bg-red-400/5 rounded p-2 border border-red-400/20 text-center"><div className="text-lg font-bold text-red-400">{result.failed}</div><div className="text-[10px] text-muted-foreground">Failed</div></div>
              <div className="bg-card/50 rounded p-2 border border-border/30 text-center"><div className="text-lg font-bold">{result.coverage?.percentage}%</div><div className="text-[10px] text-muted-foreground">Coverage</div></div>
            </div>
            <div className="text-[10px] text-muted-foreground">Duration: {result.duration}ms</div>
            <div className="space-y-1">
              {result.results?.map((r: any) => (
                <div key={r.testId} className="flex items-center gap-2 bg-card/50 rounded p-1.5 border border-border/30 text-xs">
                  {r.passed ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
                  <span className="flex-1 truncate font-mono text-[10px]">{r.testName}</span>
                  <span className="text-[10px] text-muted-foreground">{r.duration}ms</span>
                  <span className={`text-[10px] font-mono ${r.status < 400 ? "text-green-400" : "text-red-400"}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "results" && !result && <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Run tests to see results</div>}
      </div>
    </div>
  );
}
