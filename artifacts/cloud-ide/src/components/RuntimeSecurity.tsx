import { useState, useEffect } from "react";
import { X, ShieldCheck, Loader2, CheckCircle2, XCircle, AlertTriangle, ToggleLeft, ToggleRight, Lock, Shield, Wifi, HardDrive } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const MODE_CFG: Record<string, { color: string; bg: string }> = {
  enforce: { color: "text-green-400", bg: "bg-green-400/10" },
  complain: { color: "text-yellow-400", bg: "bg-yellow-400/10" },
  disabled: { color: "text-red-400", bg: "bg-red-400/10" },
};

const CAT_ICON: Record<string, any> = { filesystem: HardDrive, privileges: Lock, capabilities: Shield, network: Wifi };
const AUDIT_CFG: Record<string, { icon: any; color: string }> = {
  pass: { icon: CheckCircle2, color: "text-green-400" },
  fail: { icon: XCircle, color: "text-red-400" },
  warning: { icon: AlertTriangle, color: "text-yellow-400" },
};

export function RuntimeSecurity({ projectId, onClose }: Props) {
  const [tab, setTab] = useState<"seccomp" | "apparmor" | "flags" | "audit">("flags");
  const [seccomp, setSeccomp] = useState<any[]>([]);
  const [apparmor, setApparmor] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);
  const loadAll = async () => {
    setLoading(true);
    try {
      const [sc, aa, fl, au] = await Promise.all([
        fetch(`${API}/projects/${projectId}/runtime-security/seccomp`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/projects/${projectId}/runtime-security/apparmor`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/projects/${projectId}/runtime-security/flags`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/projects/${projectId}/runtime-security/audit`, { credentials: "include" }).then(r => r.json()),
      ]);
      setSeccomp(sc); setApparmor(aa); setFlags(fl); setAudit(au);
    } catch {} finally { setLoading(false); }
  };

  const activateSc = async (id: string) => {
    try { await fetch(`${API}/projects/${projectId}/runtime-security/seccomp/${id}/activate`, { method: "POST", credentials: "include" }); loadAll(); } catch {}
  };

  const setMode = async (id: string, mode: string) => {
    try { await fetch(`${API}/projects/${projectId}/runtime-security/apparmor/${id}/mode`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }), credentials: "include" }); loadAll(); } catch {}
  };

  const toggleFlagFn = async (id: string) => {
    try { await fetch(`${API}/projects/${projectId}/runtime-security/flags/${id}/toggle`, { method: "POST", credentials: "include" }); loadAll(); } catch {}
  };

  const passCount = audit.filter(a => a.status === "pass").length;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="runtime-security">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Runtime Security</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-400/10 text-green-400">{passCount}/{audit.length} checks pass</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        {(["flags", "seccomp", "apparmor", "audit"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-2.5 py-1 text-[10px] rounded capitalize ${tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
            {t === "apparmor" ? "AppArmor" : t === "seccomp" ? "Seccomp" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
          <>
            {tab === "flags" && (
              <>
                {["filesystem", "privileges", "capabilities", "network"].map(cat => {
                  const catFlags = flags.filter(f => f.category === cat);
                  if (!catFlags.length) return null;
                  const Icon = CAT_ICON[cat];
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-1.5 mb-1.5"><Icon className="w-3 h-3 text-muted-foreground" /><span className="text-[9px] text-muted-foreground uppercase tracking-wider">{cat}</span></div>
                      <div className="space-y-1">
                        {catFlags.map(f => (
                          <div key={f.id} className={`bg-card/50 rounded-lg border border-border/30 p-2 flex items-center gap-2 ${!f.enabled ? "opacity-50" : ""}`}>
                            <div className="flex-1">
                              <div className="text-[10px] font-medium">{f.name}</div>
                              <div className="text-[8px] text-muted-foreground">{f.description}</div>
                            </div>
                            <button onClick={() => toggleFlagFn(f.id)} className="p-0.5">
                              {f.enabled ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {tab === "seccomp" && seccomp.map(p => (
              <div key={p.id} className={`bg-card/50 rounded-lg border p-2.5 ${p.active ? "border-green-400/30" : "border-border/30"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium">{p.name}</span>
                    {p.active && <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-400/10 text-green-400">Active</span>}
                  </div>
                  {!p.active && <button onClick={() => activateSc(p.id)} className="text-[9px] px-2 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20">Activate</button>}
                </div>
                <div className="text-[8px] text-muted-foreground mb-1">Default: {p.defaultAction}</div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {p.allowedSyscalls.slice(0, 8).map((s: string) => <span key={s} className="text-[7px] px-1 py-0.5 rounded bg-green-400/10 text-green-400 font-mono">{s}</span>)}
                  {p.allowedSyscalls.length > 8 && <span className="text-[7px] text-muted-foreground">+{p.allowedSyscalls.length - 8} more</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.blockedSyscalls.map((s: string) => <span key={s} className="text-[7px] px-1 py-0.5 rounded bg-red-400/10 text-red-400 font-mono">{s}</span>)}
                </div>
              </div>
            ))}
            {tab === "apparmor" && apparmor.map(p => {
              const mcfg = MODE_CFG[p.mode];
              return (
                <div key={p.id} className="bg-card/50 rounded-lg border border-border/30 p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium">{p.name}</span>
                    <div className="flex gap-1">
                      {(["enforce", "complain", "disabled"] as const).map(m => (
                        <button key={m} onClick={() => setMode(p.id, m)} className={`text-[8px] px-1.5 py-0.5 rounded capitalize ${p.mode === m ? `${MODE_CFG[m].bg} ${MODE_CFG[m].color}` : "text-muted-foreground hover:bg-muted/30"}`}>{m}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {p.rules.map((r: string, i: number) => (
                      <div key={i} className={`text-[8px] font-mono ${r.startsWith("deny") ? "text-red-400" : "text-green-400"}`}>{r}</div>
                    ))}
                  </div>
                </div>
              );
            })}
            {tab === "audit" && audit.map(a => {
              const cfg = AUDIT_CFG[a.status];
              const Icon = cfg.icon;
              return (
                <div key={a.id} className={`bg-card/50 rounded-lg border p-2 flex items-center gap-2 ${a.status === "fail" ? "border-red-400/30" : a.status === "warning" ? "border-yellow-400/30" : "border-border/30"}`}>
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1">
                    <div className="text-[10px] font-medium">{a.check}</div>
                    <div className="text-[8px] text-muted-foreground">{a.detail}</div>
                  </div>
                  <span className={`text-[8px] capitalize ${cfg.color}`}>{a.status}</span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
