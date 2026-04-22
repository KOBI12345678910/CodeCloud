import { useState, useEffect } from "react";
import { X, Copy, Loader2, Play, Pause, CheckCircle2, XCircle, ArrowRight, Activity, BarChart3 } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

export function TrafficMirror({ projectId, onClose }: Props) {
  const [tab, setTab] = useState<"configs" | "sessions" | "compare">("configs");
  const [configs, setConfigs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        fetch(`${API}/traffic-mirror/configs`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/traffic-mirror/sessions`, { credentials: "include" }).then(r => r.json()),
      ]);
      setConfigs(c); setSessions(s);
    } catch {} finally { setLoading(false); }
  };

  const loadComparisons = async (sessionId: string) => {
    setSelectedSession(sessionId);
    setTab("compare");
    try { const r = await fetch(`${API}/traffic-mirror/comparisons/${sessionId}`, { credentials: "include" }); setComparisons(await r.json()); } catch {}
  };

  const toggle = async (id: string) => {
    try { const r = await fetch(`${API}/traffic-mirror/configs/${id}/toggle`, { method: "PATCH", credentials: "include" }); if (r.ok) { const u = await r.json(); setConfigs(p => p.map(c => c.id === id ? u : c)); } } catch {}
  };

  const statusColor = (s: string) => s === "active" ? "text-green-400" : s === "paused" ? "text-yellow-400" : "text-muted-foreground";
  const matchRate = (s: any) => s.stats.mirrored > 0 ? ((s.stats.matched / s.stats.mirrored) * 100).toFixed(1) : "0";

  return (
    <div className="h-full flex flex-col bg-background" data-testid="traffic-mirror">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Copy className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Traffic Mirroring</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        {(["configs", "sessions", "compare"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-2.5 py-1 text-[10px] rounded capitalize ${tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>{t === "compare" ? "Comparisons" : t}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : <>
          {tab === "configs" && configs.map(c => (
            <div key={c.id} className="bg-card/50 rounded-lg border border-border/30 p-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{c.sourceEnv}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium">{c.targetEnv}</span>
                </div>
                <button onClick={() => toggle(c.id)} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${c.enabled ? "bg-green-400/10 text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {c.enabled ? <><Play className="w-2.5 h-2.5" /> Active</> : <><Pause className="w-2.5 h-2.5" /> Paused</>}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-muted-foreground">Sample Rate:</span> <span className="font-medium">{c.sampleRate}%</span></div>
                <div><span className="text-muted-foreground">Filters:</span> <span className="font-medium">{c.filters.length} rules</span></div>
              </div>
              {c.filters.map((f: any, i: number) => (
                <div key={i} className="mt-1.5 text-[9px] bg-muted/30 rounded px-2 py-1"><code>{f.methods.join(",")} {f.pathPattern}</code></div>
              ))}
            </div>
          ))}
          {tab === "sessions" && sessions.map(s => (
            <button key={s.id} onClick={() => loadComparisons(s.id)} className="w-full text-left bg-card/50 rounded-lg border border-border/30 p-2.5 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3" />
                  <span className="text-xs font-medium">{s.id}</span>
                </div>
                <span className={`text-[10px] capitalize ${statusColor(s.status)}`}>{s.status}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-[10px]">
                <div><div className="text-muted-foreground">Total</div><div className="font-medium">{s.stats.totalRequests.toLocaleString()}</div></div>
                <div><div className="text-muted-foreground">Mirrored</div><div className="font-medium">{s.stats.mirrored.toLocaleString()}</div></div>
                <div><div className="text-muted-foreground">Match Rate</div><div className="font-medium text-green-400">{matchRate(s)}%</div></div>
                <div><div className="text-muted-foreground">Avg Δ Latency</div><div className="font-medium">{s.stats.avgLatencyDiffMs}ms</div></div>
              </div>
              <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden flex">
                <div className="bg-green-400 h-full" style={{ width: `${matchRate(s)}%` }} />
                <div className="bg-red-400 h-full" style={{ width: `${(s.stats.mismatched / s.stats.mirrored * 100).toFixed(1)}%` }} />
                <div className="bg-yellow-400 h-full" style={{ width: `${(s.stats.errors / s.stats.mirrored * 100).toFixed(1)}%` }} />
              </div>
            </button>
          ))}
          {tab === "compare" && (
            <>
              {selectedSession && <div className="text-[10px] text-muted-foreground mb-1">Session: {selectedSession}</div>}
              {comparisons.map(c => (
                <div key={c.id} className={`bg-card/50 rounded-lg border p-2.5 ${c.match ? "border-border/30" : "border-red-400/30"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[9px]">{c.method}</span>
                      <span className="font-medium">{c.path}</span>
                    </div>
                    {c.match ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div className="bg-muted/20 rounded p-1.5">
                      <div className="text-[9px] text-muted-foreground mb-1">Source</div>
                      <div>Status: <span className="font-medium">{c.source.status}</span></div>
                      <div>Latency: <span className="font-medium">{c.source.latencyMs}ms</span></div>
                    </div>
                    <div className="bg-muted/20 rounded p-1.5">
                      <div className="text-[9px] text-muted-foreground mb-1">Target</div>
                      <div>Status: <span className={`font-medium ${c.target.status !== c.source.status ? "text-red-400" : ""}`}>{c.target.status}</span></div>
                      <div>Latency: <span className={`font-medium ${c.target.latencyMs > c.source.latencyMs * 2 ? "text-yellow-400" : ""}`}>{c.target.latencyMs}ms</span></div>
                    </div>
                  </div>
                  {c.diffSummary && <div className="mt-1.5 text-[9px] px-2 py-1 rounded bg-yellow-400/10 text-yellow-400">{c.diffSummary}</div>}
                </div>
              ))}
            </>
          )}
        </>}
      </div>
    </div>
  );
}
