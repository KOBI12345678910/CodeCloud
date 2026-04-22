import { useState, useEffect } from "react";
import { X, HeartPulse, Loader2, RefreshCw, ShieldOff, CheckCircle2, AlertTriangle, XCircle, Zap, Clock } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const STATE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  healthy: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10", label: "Healthy" },
  recovering: { icon: RefreshCw, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Recovering" },
  circuit_breaker_open: { icon: ShieldOff, color: "text-red-400", bg: "bg-red-400/10", label: "Circuit Open" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Failed" },
};

const EVENT_ICONS: Record<string, { icon: any; color: string }> = {
  crash_detected: { icon: XCircle, color: "text-red-400" },
  restart_attempted: { icon: RefreshCw, color: "text-yellow-400" },
  restart_succeeded: { icon: CheckCircle2, color: "text-green-400" },
  restart_failed: { icon: XCircle, color: "text-red-400" },
  circuit_breaker_open: { icon: ShieldOff, color: "text-red-400" },
  circuit_breaker_closed: { icon: Zap, color: "text-green-400" },
  health_check_passed: { icon: HeartPulse, color: "text-green-400" },
  health_check_failed: { icon: AlertTriangle, color: "text-yellow-400" },
};

export function AutoHealing({ projectId, onClose }: Props) {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try { const res = await fetch(`${API}/projects/${projectId}/auto-healing`, { credentials: "include" }); if (res.ok) setStatuses(await res.json()); } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const restart = async (depId: string) => {
    try { await fetch(`${API}/projects/${projectId}/auto-healing/${depId}/restart`, { method: "POST", credentials: "include" }); load(); } catch {}
  };

  const resetBreaker = async (depId: string) => {
    try { await fetch(`${API}/projects/${projectId}/auto-healing/${depId}/reset-breaker`, { method: "POST", credentials: "include" }); load(); } catch {}
  };

  const timeAgo = (ts: string) => {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="auto-healing">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><HeartPulse className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Auto-Healing</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {statuses.map(s => {
            const cfg = STATE_CONFIG[s.state] || STATE_CONFIG.failed;
            const StateIcon = cfg.icon;
            const isExpanded = expanded === s.deploymentId;
            return (
              <div key={s.deploymentId} className="bg-card/50 rounded-lg border border-border/30 overflow-hidden">
                <button onClick={() => setExpanded(isExpanded ? null : s.deploymentId)} className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/20">
                  <div className={`p-1 rounded ${cfg.bg}`}><StateIcon className={`w-3.5 h-3.5 ${cfg.color}`} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium font-mono truncate">{s.deploymentId}</div>
                    <div className="text-[9px] text-muted-foreground">{cfg.label} · {s.uptime}% uptime · {s.totalCrashes} crashes / {s.totalRecoveries} recoveries</div>
                  </div>
                  <div className="flex gap-1">
                    {s.state === "circuit_breaker_open" && (
                      <button onClick={e => { e.stopPropagation(); resetBreaker(s.deploymentId); }} className="px-1.5 py-0.5 text-[9px] bg-yellow-400/10 text-yellow-400 rounded hover:bg-yellow-400/20">Reset Breaker</button>
                    )}
                    <button onClick={e => { e.stopPropagation(); restart(s.deploymentId); }} className="px-1.5 py-0.5 text-[9px] bg-primary/10 text-primary rounded hover:bg-primary/20">Restart</button>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-border/20 px-2.5 py-2 space-y-1.5">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-muted/30 rounded p-1.5"><div className="text-[10px] font-bold">{s.currentAttempt}/{s.policy.maxRetries}</div><div className="text-[8px] text-muted-foreground">Attempts</div></div>
                      <div className="bg-muted/30 rounded p-1.5"><div className="text-[10px] font-bold">{s.policy.backoffBase / 1000}s</div><div className="text-[8px] text-muted-foreground">Backoff Base</div></div>
                      <div className="bg-muted/30 rounded p-1.5"><div className="text-[10px] font-bold">{s.policy.healthCheckInterval / 1000}s</div><div className="text-[8px] text-muted-foreground">Health Int.</div></div>
                      <div className="bg-muted/30 rounded p-1.5"><div className="text-[10px] font-bold font-mono">{s.policy.healthCheckPath}</div><div className="text-[8px] text-muted-foreground">Health Path</div></div>
                    </div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Recent Events</div>
                    {s.recentEvents.map((ev: any) => {
                      const evCfg = EVENT_ICONS[ev.type] || { icon: AlertTriangle, color: "text-muted-foreground" };
                      const EvIcon = evCfg.icon;
                      return (
                        <div key={ev.id} className="flex items-start gap-1.5 text-[10px]">
                          <EvIcon className={`w-3 h-3 mt-0.5 shrink-0 ${evCfg.color}`} />
                          <div className="flex-1 min-w-0">
                            <span>{ev.details}</span>
                            {ev.backoffDelay > 0 && <span className="text-muted-foreground"> (backoff: {ev.backoffDelay / 1000}s)</span>}
                          </div>
                          <span className="text-[9px] text-muted-foreground shrink-0 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{timeAgo(ev.timestamp)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
