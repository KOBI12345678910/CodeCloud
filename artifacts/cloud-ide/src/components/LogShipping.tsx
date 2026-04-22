import { useState, useEffect } from "react";
import { X, Truck, Plus, Trash2, Loader2, CheckCircle2, XCircle, ToggleLeft, ToggleRight, Zap, RefreshCw } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Props { projectId: string; onClose: () => void; }

const DEST_LABELS: Record<string, string> = { datadog: "Datadog", splunk: "Splunk", elk: "ELK Stack", cloudwatch: "CloudWatch", custom: "Custom" };
const DEST_COLORS: Record<string, string> = { datadog: "text-purple-400", splunk: "text-green-400", elk: "text-yellow-400", cloudwatch: "text-orange-400", custom: "text-blue-400" };

function fmt(n: number): string { return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n); }
function timeAgo(ts: string | null): string {
  if (!ts) return "never";
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function LogShipping({ projectId, onClose }: Props) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCfg, setNewCfg] = useState({ destination: "datadog", endpoint: "", apiKey: "", format: "json", batchSize: 100, flushIntervalMs: 5000 });

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const r = await fetch(`${API}/projects/${projectId}/log-shipping`, { credentials: "include" }); if (r.ok) setConfigs(await r.json()); } catch {} finally { setLoading(false); }
  };

  const toggle = async (id: string, enabled: boolean) => {
    try { await fetch(`${API}/projects/${projectId}/log-shipping/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }), credentials: "include" }); load(); } catch {}
  };

  const test = async (id: string) => {
    setTesting(id); setTestResult(null);
    try { const r = await fetch(`${API}/projects/${projectId}/log-shipping/${id}/test`, { method: "POST", credentials: "include" }); const d = await r.json(); setTestResult({ id, ok: d.success, msg: d.message }); } catch { setTestResult({ id, ok: false, msg: "Connection failed" }); } finally { setTesting(null); }
  };

  const add = async () => {
    if (!newCfg.endpoint.trim()) return;
    try {
      await fetch(`${API}/projects/${projectId}/log-shipping`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCfg), credentials: "include" });
      setNewCfg({ destination: "datadog", endpoint: "", apiKey: "", format: "json", batchSize: 100, flushIntervalMs: 5000 }); setShowAdd(false); load();
    } catch {}
  };

  const del = async (id: string) => {
    try { await fetch(`${API}/projects/${projectId}/log-shipping/${id}`, { method: "DELETE", credentials: "include" }); load(); } catch {}
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="log-shipping">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Log Shipping</span>
          <span className="text-[9px] text-muted-foreground">{configs.length} destinations</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowAdd(v => !v)} className="p-0.5 hover:bg-muted rounded"><Plus className="w-3.5 h-3.5" /></button>
          <button onClick={load} className="p-0.5 hover:bg-muted rounded"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {showAdd && (
          <div className="bg-card/50 rounded-lg border border-primary/30 p-2.5 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <select value={newCfg.destination} onChange={e => setNewCfg(n => ({ ...n, destination: e.target.value }))} className="px-2 py-1 text-[10px] bg-muted/30 border border-border/30 rounded">
                {Object.entries(DEST_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={newCfg.format} onChange={e => setNewCfg(n => ({ ...n, format: e.target.value }))} className="px-2 py-1 text-[10px] bg-muted/30 border border-border/30 rounded">
                <option value="json">JSON</option><option value="syslog">Syslog</option><option value="cef">CEF</option><option value="raw">Raw</option>
              </select>
              <input type="number" value={newCfg.batchSize} onChange={e => setNewCfg(n => ({ ...n, batchSize: parseInt(e.target.value) || 100 }))} className="px-2 py-1 text-[10px] bg-muted/30 border border-border/30 rounded" placeholder="Batch size" />
            </div>
            <input value={newCfg.endpoint} onChange={e => setNewCfg(n => ({ ...n, endpoint: e.target.value }))} className="w-full px-2 py-1 text-[10px] bg-muted/30 border border-border/30 rounded" placeholder="Endpoint URL" />
            <input value={newCfg.apiKey} onChange={e => setNewCfg(n => ({ ...n, apiKey: e.target.value }))} className="w-full px-2 py-1 text-[10px] bg-muted/30 border border-border/30 rounded" placeholder="API Key" type="password" />
            <button onClick={add} disabled={!newCfg.endpoint.trim()} className="px-3 py-1 text-[10px] bg-primary/10 text-primary rounded hover:bg-primary/20 disabled:opacity-50">Add Destination</button>
          </div>
        )}
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
          <>
            {configs.length === 0 && <div className="text-center text-[10px] text-muted-foreground py-4">No log shipping destinations configured</div>}
            {configs.map(cfg => (
              <div key={cfg.id} className={`bg-card/50 rounded-lg border ${cfg.enabled ? "border-border/30" : "border-border/20 opacity-60"} p-2.5`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium ${DEST_COLORS[cfg.destination] || "text-blue-400"}`}>{DEST_LABELS[cfg.destination] || cfg.destination}</span>
                    <span className="text-[8px] px-1 py-0.5 rounded bg-muted/30 text-muted-foreground uppercase">{cfg.format}</span>
                    <span className={`text-[8px] px-1 py-0.5 rounded ${cfg.enabled ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>{cfg.enabled ? "active" : "paused"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggle(cfg.id, !cfg.enabled)} className="p-0.5 hover:bg-muted rounded" title={cfg.enabled ? "Disable" : "Enable"}>
                      {cfg.enabled ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <button onClick={() => test(cfg.id)} disabled={testing === cfg.id} className="p-0.5 hover:bg-muted rounded" title="Test connection">
                      {testing === cfg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => del(cfg.id)} className="p-0.5 hover:bg-muted rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>
                  </div>
                </div>
                <div className="text-[8px] font-mono text-muted-foreground mb-2 truncate">{cfg.endpoint}</div>
                <div className="grid grid-cols-5 gap-2 text-[8px]">
                  <div><div className="text-muted-foreground">Shipped</div><div className="font-medium">{fmt(cfg.stats.totalShipped)}</div></div>
                  <div><div className="text-muted-foreground">Dropped</div><div className="font-medium text-yellow-400">{fmt(cfg.stats.totalDropped)}</div></div>
                  <div><div className="text-muted-foreground">Failed</div><div className="font-medium text-red-400">{fmt(cfg.stats.totalFailed)}</div></div>
                  <div><div className="text-muted-foreground">Latency</div><div className="font-medium">{cfg.stats.avgLatencyMs}ms</div></div>
                  <div><div className="text-muted-foreground">Last</div><div className="font-medium">{timeAgo(cfg.stats.lastShippedAt)}</div></div>
                </div>
                {cfg.filters.length > 0 && (
                  <div className="mt-1.5 flex gap-1 flex-wrap">
                    {cfg.filters.map((f: any, i: number) => (
                      <span key={i} className="text-[7px] px-1 py-0.5 rounded bg-blue-400/10 text-blue-400">
                        {f.level ? `level: ${f.level.join(",")}` : f.source ? `source: ${f.source.join(",")}` : f.pattern ? `pattern: ${f.pattern}` : "all"}
                      </span>
                    ))}
                  </div>
                )}
                {testResult && testResult.id === cfg.id && (
                  <div className={`mt-1.5 flex items-center gap-1 text-[8px] ${testResult.ok ? "text-green-400" : "text-red-400"}`}>
                    {testResult.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {testResult.msg}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
