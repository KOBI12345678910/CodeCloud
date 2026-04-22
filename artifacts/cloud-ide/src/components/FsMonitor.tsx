import { useState, useEffect } from "react";
import { X, Eye, FileWarning, Shield, Loader2, AlertTriangle, FilePlus, FileEdit, Trash2, ArrowRight, Lock, CheckCircle2, XCircle, Clock, Plus, ToggleLeft, ToggleRight } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const EVENT_CFG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  create: { icon: FilePlus, color: "text-green-400", bg: "bg-green-400/10", label: "Created" },
  modify: { icon: FileEdit, color: "text-blue-400", bg: "bg-blue-400/10", label: "Modified" },
  delete: { icon: Trash2, color: "text-red-400", bg: "bg-red-400/10", label: "Deleted" },
  rename: { icon: ArrowRight, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Renamed" },
  permission: { icon: Lock, color: "text-purple-400", bg: "bg-purple-400/10", label: "Permission" },
};

const INTEGRITY_CFG: Record<string, { icon: any; color: string }> = {
  ok: { icon: CheckCircle2, color: "text-green-400" },
  modified: { icon: AlertTriangle, color: "text-yellow-400" },
  missing: { icon: XCircle, color: "text-red-400" },
};

function timeAgo(ts: string): string {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function FsMonitor({ projectId, onClose }: Props) {
  const [tab, setTab] = useState<"events" | "rules" | "integrity">("events");
  const [events, setEvents] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [integrity, setIntegrity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "suspicious">("all");

  useEffect(() => { loadAll(); }, []);
  const loadAll = async () => {
    setLoading(true);
    try {
      const [ev, ru, ic] = await Promise.all([
        fetch(`${API}/projects/${projectId}/fs-monitor/events`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/projects/${projectId}/fs-monitor/rules`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/projects/${projectId}/fs-monitor/integrity`, { credentials: "include" }).then(r => r.json()),
      ]);
      setEvents(ev); setRules(ru); setIntegrity(ic);
    } catch {} finally { setLoading(false); }
  };

  const toggleRuleFn = async (ruleId: string) => {
    try { await fetch(`${API}/projects/${projectId}/fs-monitor/rules/${ruleId}/toggle`, { method: "POST", credentials: "include" }); loadAll(); } catch {}
  };

  const deleteRuleFn = async (ruleId: string) => {
    try { await fetch(`${API}/projects/${projectId}/fs-monitor/rules/${ruleId}`, { method: "DELETE", credentials: "include" }); loadAll(); } catch {}
  };

  const filtered = filter === "suspicious" ? events.filter(e => e.suspicious) : events;
  const suspiciousCount = events.filter(e => e.suspicious).length;
  const integrityIssues = integrity.filter(i => i.status !== "ok").length;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="fs-monitor">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Filesystem Monitor</span>
          {suspiciousCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400">{suspiciousCount} suspicious</span>}
          {integrityIssues > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400">{integrityIssues} integrity issues</span>}
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        {(["events", "rules", "integrity"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-2.5 py-1 text-[10px] rounded capitalize ${tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
            {t} {t === "events" ? `(${events.length})` : t === "rules" ? `(${rules.length})` : `(${integrity.length})`}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
          <>
            {tab === "events" && (
              <>
                <div className="flex gap-1 mb-1">
                  <button onClick={() => setFilter("all")} className={`px-2 py-0.5 text-[9px] rounded ${filter === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>All</button>
                  <button onClick={() => setFilter("suspicious")} className={`px-2 py-0.5 text-[9px] rounded ${filter === "suspicious" ? "bg-red-400/10 text-red-400" : "text-muted-foreground"}`}>Suspicious ({suspiciousCount})</button>
                </div>
                {filtered.map(ev => {
                  const cfg = EVENT_CFG[ev.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={ev.id} className={`bg-card/50 rounded-lg border p-2.5 ${ev.suspicious ? "border-red-400/30" : "border-border/30"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${cfg.bg}`}><Icon className={`w-3 h-3 ${cfg.color}`} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] px-1 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                            <span className="text-[10px] font-mono truncate">{ev.path}</span>
                          </div>
                          {ev.oldPath && <div className="text-[9px] text-muted-foreground mt-0.5">from: {ev.oldPath}</div>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[9px] text-muted-foreground">{ev.user}</div>
                          <div className="text-[8px] text-muted-foreground">{timeAgo(ev.timestamp)}</div>
                        </div>
                      </div>
                      {ev.suspicious && (
                        <div className="flex items-center gap-1 mt-1.5 px-2 py-1 bg-red-400/5 rounded text-[9px] text-red-400">
                          <AlertTriangle className="w-2.5 h-2.5 shrink-0" />{ev.reason}
                        </div>
                      )}
                      {ev.size && <div className="text-[8px] text-muted-foreground mt-1">{(ev.size / 1024).toFixed(1)} KB</div>}
                    </div>
                  );
                })}
              </>
            )}
            {tab === "rules" && (
              <>
                {rules.map(r => (
                  <div key={r.id} className={`bg-card/50 rounded-lg border border-border/30 p-2.5 ${!r.enabled ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-[10px] font-mono">{r.pattern}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex gap-1">{r.events.map((e: string) => <span key={e} className="text-[8px] px-1 py-0.5 rounded bg-muted/30">{e}</span>)}</div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${r.action === "alert" ? "bg-yellow-400/10 text-yellow-400" : r.action === "block" ? "bg-red-400/10 text-red-400" : "bg-blue-400/10 text-blue-400"}`}>{r.action}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleRuleFn(r.id)} className="p-1 hover:bg-muted rounded">
                          {r.enabled ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <button onClick={() => deleteRuleFn(r.id)} className="p-1 hover:bg-muted rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            {tab === "integrity" && integrity.map(ic => {
              const cfg = INTEGRITY_CFG[ic.status];
              const Icon = cfg.icon;
              return (
                <div key={ic.id} className={`bg-card/50 rounded-lg border p-2.5 ${ic.status !== "ok" ? "border-yellow-400/30" : "border-border/30"}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono truncate">{ic.path}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[8px] text-muted-foreground">
                        <span>Expected: {ic.expectedHash}</span>
                        {ic.status !== "ok" && <span>Current: {ic.currentHash || "N/A"}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[9px] capitalize ${cfg.color}`}>{ic.status}</span>
                      <div className="text-[8px] text-muted-foreground">{timeAgo(ic.lastChecked)}</div>
                    </div>
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
