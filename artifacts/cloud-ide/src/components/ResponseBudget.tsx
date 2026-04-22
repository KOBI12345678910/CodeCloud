import { useState, useEffect } from "react";
import { X, Clock, AlertTriangle, CheckCircle2, XCircle, Loader2, TrendingUp, Bell, BellOff } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { onClose: () => void; }

const METHOD_COLOR: Record<string, string> = { GET: "text-green-400 bg-green-400/10", POST: "text-blue-400 bg-blue-400/10", PUT: "text-yellow-400 bg-yellow-400/10", DELETE: "text-red-400 bg-red-400/10" };

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 60},${28 - (v / max) * 24}`).join(" ");
  return <svg viewBox="0 0 60 28" className="w-16 h-5"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PctBar({ value, target }: { value: number; target: number }) {
  const pct = Math.min((value / target) * 100, 150);
  const over = value > target;
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden relative">
      <div className={`h-full rounded-full ${over ? "bg-red-400" : "bg-green-400"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      {pct > 100 && <div className="absolute right-0 top-0 h-full bg-red-400/30 rounded-full" style={{ width: `${pct - 100}%` }} />}
    </div>
  );
}

function timeAgo(ts: string): string {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function ResponseBudget({ onClose }: Props) {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"endpoints" | "alerts">("endpoints");

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [b, a] = await Promise.all([
        fetch(`${API}/response-budget/endpoints`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/response-budget/alerts`, { credentials: "include" }).then(r => r.json()),
      ]);
      setBudgets(b); setAlerts(a);
    } catch {} finally { setLoading(false); }
  };

  const ack = async (id: string) => {
    try { await fetch(`${API}/response-budget/alerts/${id}/acknowledge`, { method: "POST", credentials: "include" }); load(); } catch {}
  };

  const exceeded = budgets.filter(b => b.budgetExceeded).length;
  const unacked = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="response-budget">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Response Time Budget</span>
          {exceeded > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400">{exceeded} exceeded</span>}
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        <button onClick={() => setTab("endpoints")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "endpoints" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Endpoints ({budgets.length})</button>
        <button onClick={() => setTab("alerts")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "alerts" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Alerts ({unacked} new)</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
          <>
            {tab === "endpoints" && budgets.map(b => (
              <div key={b.id} className={`bg-card/50 rounded-lg border p-2.5 ${b.budgetExceeded ? "border-red-400/30" : "border-border/30"}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${METHOD_COLOR[b.method] || ""}`}>{b.method}</span>
                  <span className="text-[10px] font-mono flex-1 truncate">{b.endpoint}</span>
                  {b.budgetExceeded ? <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                  <Sparkline data={b.trend} color={b.budgetExceeded ? "#f87171" : "#4ade80"} />
                </div>
                <div className="grid grid-cols-4 gap-2 text-[9px] mb-1.5">
                  <div className="text-center"><span className="text-muted-foreground">Target</span><div className="font-medium">{b.targetMs}ms</div></div>
                  <div className="text-center"><span className="text-muted-foreground">p50</span><div className={`font-medium ${b.p50 > b.targetMs ? "text-red-400" : ""}`}>{b.p50}ms</div></div>
                  <div className="text-center"><span className="text-muted-foreground">p95</span><div className={`font-medium ${b.p95 > b.targetMs ? "text-red-400" : ""}`}>{b.p95}ms</div></div>
                  <div className="text-center"><span className="text-muted-foreground">p99</span><div className={`font-medium ${b.p99 > b.targetMs ? "text-red-400" : ""}`}>{b.p99}ms</div></div>
                </div>
                <PctBar value={b.p95} target={b.targetMs} />
                <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
                  <span>{b.requestCount.toLocaleString()} requests</span>
                  <span>{timeAgo(b.lastUpdated)}</span>
                </div>
              </div>
            ))}
            {tab === "alerts" && (
              <>
                {alerts.length === 0 && <div className="text-center text-[10px] text-muted-foreground py-4">No alerts</div>}
                {alerts.map(a => (
                  <div key={a.id} className={`bg-card/50 rounded-lg border p-2.5 ${a.acknowledged ? "border-border/30 opacity-50" : a.severity === "critical" ? "border-red-400/30" : "border-yellow-400/30"}`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${a.severity === "critical" ? "text-red-400" : "text-yellow-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] px-1 py-0.5 rounded ${a.severity === "critical" ? "bg-red-400/10 text-red-400" : "bg-yellow-400/10 text-yellow-400"}`}>{a.severity}</span>
                          <span className="text-[10px] font-mono truncate">{a.endpoint}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{a.percentile} exceeded: {a.actualMs}ms / {a.targetMs}ms target</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[8px] text-muted-foreground">{timeAgo(a.triggeredAt)}</span>
                        {!a.acknowledged && (
                          <button onClick={() => ack(a.id)} className="p-0.5 hover:bg-muted rounded" title="Acknowledge"><BellOff className="w-3 h-3 text-muted-foreground hover:text-primary" /></button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
