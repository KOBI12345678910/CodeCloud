import { useState, useEffect } from "react";
import { X, Timer, Loader2, Square, AlertTriangle, CheckCircle2, XCircle, Clock, Settings } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  running: { color: "text-green-400", bg: "bg-green-400/10", label: "Running" },
  grace_period: { color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Grace Period" },
  timed_out: { color: "text-red-400", bg: "bg-red-400/10", label: "Timed Out" },
  killed: { color: "text-red-400", bg: "bg-red-400/10", label: "Killed" },
};

const EVENT_CFG: Record<string, { icon: any; color: string }> = {
  graceful_term: { icon: AlertTriangle, color: "text-yellow-400" },
  force_kill: { icon: XCircle, color: "text-red-400" },
  alert_sent: { icon: AlertTriangle, color: "text-orange-400" },
  completed: { icon: CheckCircle2, color: "text-green-400" },
};

const fmtTime = (s: number) => s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

export function ExecTimeout({ projectId, onClose }: Props) {
  const [tab, setTab] = useState<"running" | "configs" | "events">("running");
  const [running, setRunning] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rRes, cRes, eRes] = await Promise.all([
          fetch(`${API}/projects/${projectId}/exec-timeout/running`, { credentials: "include" }),
          fetch(`${API}/projects/${projectId}/exec-timeout/configs`, { credentials: "include" }),
          fetch(`${API}/projects/${projectId}/exec-timeout/events`, { credentials: "include" }),
        ]);
        if (rRes.ok) setRunning(await rRes.json());
        if (cRes.ok) setConfigs(await cRes.json());
        if (eRes.ok) setEvents(await eRes.json());
      } catch {} finally { setLoading(false); }
    })();
  }, [projectId]);

  const kill = async (execId: string) => {
    try { await fetch(`${API}/projects/${projectId}/exec-timeout/${execId}/kill`, { method: "POST", credentials: "include" }); setRunning(running.filter(r => r.id !== execId)); } catch {}
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="exec-timeout">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Timer className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Exec Timeouts</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        {(["running", "configs", "events"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-2.5 py-1 text-[10px] rounded capitalize ${tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>{t}</button>
        ))}
      </div>
      {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {tab === "running" && (running.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">No running processes</div>
          ) : running.map(r => {
            const cfg = STATUS_CFG[r.status] || STATUS_CFG.running;
            const pct = Math.min(100, (r.elapsed / r.timeout) * 100);
            return (
              <div key={r.id} className="bg-card/50 rounded-lg border border-border/30 p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono flex-1 truncate">{r.command}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  <button onClick={() => kill(r.id)} className="p-0.5 hover:bg-red-400/10 rounded" title="Kill"><Square className="w-3 h-3 text-red-400" /></button>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground mb-1">
                  <span>PID {r.pid}</span><span>by {r.userId}</span><span>{fmtTime(r.elapsed)} / {fmtTime(r.timeout)}</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-400" : pct > 70 ? "bg-yellow-400" : "bg-green-400"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          }))}

          {tab === "configs" && configs.map(c => (
            <div key={c.id} className="flex items-center gap-2 bg-card/50 rounded border border-border/30 p-2">
              <Settings className="w-3 h-3 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono truncate">{c.pattern}</div>
                <div className="text-[9px] text-muted-foreground">Timeout: {fmtTime(c.timeout)} · Grace: {fmtTime(c.gracePeriod)} · {c.action}</div>
              </div>
              <span className={`w-1.5 h-1.5 rounded-full ${c.enabled ? "bg-green-400" : "bg-muted-foreground"}`} />
            </div>
          ))}

          {tab === "events" && events.map(e => {
            const eCfg = EVENT_CFG[e.action] || EVENT_CFG.completed;
            const Icon = eCfg.icon;
            return (
              <div key={e.id} className="flex items-start gap-2 bg-card/50 rounded border border-border/30 p-2 text-[10px]">
                <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${eCfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-mono truncate">{e.command}</div>
                  <div className="text-[9px] text-muted-foreground">{e.action.replace("_", " ")} · {fmtTime(e.elapsed)}/{fmtTime(e.timeout)}{e.exitCode !== null ? ` · exit ${e.exitCode}` : ""}</div>
                </div>
                <span className="text-[9px] text-muted-foreground shrink-0 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{new Date(e.timestamp).toLocaleTimeString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
