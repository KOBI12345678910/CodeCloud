import { useState, useEffect } from "react";
import { X, ArrowRight, Loader2, CheckCircle2, XCircle, Clock, Rocket, RotateCcw, ShieldCheck, AlertTriangle, ChevronRight } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { onClose: () => void; }

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Pending Approval" },
  approved: { color: "text-blue-400", bg: "bg-blue-400/10", label: "Approved" },
  rejected: { color: "text-red-400", bg: "bg-red-400/10", label: "Rejected" },
  promoting: { color: "text-purple-400", bg: "bg-purple-400/10", label: "Promoting..." },
  completed: { color: "text-green-400", bg: "bg-green-400/10", label: "Completed" },
  rolled_back: { color: "text-orange-400", bg: "bg-orange-400/10", label: "Rolled Back" },
};

const ENV_STATUS: Record<string, { color: string; dot: string }> = {
  healthy: { color: "border-green-400/30", dot: "bg-green-400" },
  degraded: { color: "border-yellow-400/30", dot: "bg-yellow-400" },
  down: { color: "border-red-400/30", dot: "bg-red-400" },
};

const CHECK_ICON: Record<string, any> = { pass: CheckCircle2, fail: XCircle, pending: Clock, skipped: AlertTriangle };
const CHECK_COLOR: Record<string, string> = { pass: "text-green-400", fail: "text-red-400", pending: "text-yellow-400", skipped: "text-muted-foreground" };

function timeAgo(ts: string): string {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function EnvPromotion({ onClose }: Props) {
  const [pipeline, setPipeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pipeline" | "promotions">("pipeline");

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const r = await fetch(`${API}/env-promotion/pipeline`, { credentials: "include" }); if (r.ok) setPipeline(await r.json()); } catch {} finally { setLoading(false); }
  };

  const action = async (id: string, act: string) => {
    try { const r = await fetch(`${API}/env-promotion/${id}/${act}`, { method: "POST", credentials: "include" }); if (r.ok) load(); } catch {}
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="env-promotion">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Rocket className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Environment Promotion</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        <button onClick={() => setTab("pipeline")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "pipeline" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Pipeline</button>
        <button onClick={() => setTab("promotions")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "promotions" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Promotions ({pipeline?.promotions?.length || 0})</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : pipeline && (
          <>
            {tab === "pipeline" && (
              <>
                <div className="flex items-center gap-2">
                  {pipeline.environments.sort((a: any, b: any) => a.order - b.order).map((env: any, i: number, arr: any[]) => {
                    const cfg = ENV_STATUS[env.status];
                    return (
                      <div key={env.id} className="flex items-center gap-2 flex-1">
                        <div className={`flex-1 bg-card/50 rounded-lg border p-3 ${cfg.color}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <span className="text-xs font-medium">{env.name}</span>
                          </div>
                          <div className="text-[10px] font-mono text-primary">{env.currentBuild}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">{timeAgo(env.buildAt)}</div>
                        </div>
                        {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Environment Comparison</div>
                <div className="bg-card/50 rounded-lg border border-border/30 overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead><tr className="border-b border-border/30">
                      <th className="text-left p-2 text-muted-foreground font-normal">Config</th>
                      {pipeline.environments.map((e: any) => <th key={e.id} className="text-left p-2 font-medium">{e.name}</th>)}
                    </tr></thead>
                    <tbody>
                      {Object.keys(pipeline.environments[0]?.config || {}).map((key: string) => (
                        <tr key={key} className="border-b border-border/20">
                          <td className="p-2 font-mono text-muted-foreground">{key}</td>
                          {pipeline.environments.map((e: any) => {
                            const val = e.config[key];
                            const differs = pipeline.environments.some((o: any) => o.config[key] !== val);
                            return <td key={e.id} className={`p-2 font-mono ${differs ? "text-yellow-400" : ""}`}>{val || "—"}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {tab === "promotions" && pipeline.promotions.map((p: any) => {
              const cfg = STATUS_CFG[p.status] || STATUS_CFG.pending;
              return (
                <div key={p.id} className="bg-card/50 rounded-lg border border-border/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{p.fromEnv}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{p.toEnv}</span>
                      <span className="text-[10px] font-mono text-primary">{p.build}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="flex gap-4 text-[9px] text-muted-foreground mb-2">
                    <span>By: {p.requestedBy.split("@")[0]}</span>
                    <span>{timeAgo(p.requestedAt)}</span>
                    {p.approvedBy && <span>Approved: {p.approvedBy.split("@")[0]}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {p.checks.map((c: any, i: number) => {
                      const Icon = CHECK_ICON[c.status];
                      return (
                        <div key={i} className="flex items-center gap-1 text-[9px] bg-muted/20 rounded px-1.5 py-0.5">
                          <Icon className={`w-2.5 h-2.5 ${CHECK_COLOR[c.status]}`} />
                          <span>{c.name}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-1">
                    {p.status === "pending" && (
                      <>
                        <button onClick={() => action(p.id, "approve")} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-green-400/10 text-green-400 rounded hover:bg-green-400/20"><ShieldCheck className="w-3 h-3" /> Approve</button>
                        <button onClick={() => action(p.id, "reject")} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-red-400/10 text-red-400 rounded hover:bg-red-400/20"><XCircle className="w-3 h-3" /> Reject</button>
                      </>
                    )}
                    {p.status === "approved" && (
                      <button onClick={() => action(p.id, "execute")} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-primary/10 text-primary rounded hover:bg-primary/20"><Rocket className="w-3 h-3" /> Deploy</button>
                    )}
                    {p.status === "completed" && (
                      <button onClick={() => action(p.id, "rollback")} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-orange-400/10 text-orange-400 rounded hover:bg-orange-400/20"><RotateCcw className="w-3 h-3" /> Rollback</button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
