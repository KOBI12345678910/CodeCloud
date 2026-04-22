import { useState, useEffect } from "react";
import { X, Shield, Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, RotateCcw, ToggleLeft, ToggleRight } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { onClose: () => void; }

const STATUS_CFG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  valid: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10", label: "Valid" },
  expiring: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Expiring Soon" },
  expired: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Expired" },
  renewing: { icon: RefreshCw, color: "text-blue-400", bg: "bg-blue-400/10", label: "Renewing" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Failed" },
};

function daysUntil(date: string): number { return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000); }
function fmtDate(d: string): string { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

export function SSLMonitor({ onClose }: Props) {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [tab, setTab] = useState<"overview" | "history">("overview");

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const r = await fetch(`${API}/ssl/certificates`, { credentials: "include" }); if (r.ok) setCerts(await r.json()); } catch {} finally { setLoading(false); }
  };

  const renew = async (id: string) => {
    try { const r = await fetch(`${API}/ssl/certificates/${id}/renew`, { method: "POST", credentials: "include" }); if (r.ok) { const u = await r.json(); setCerts(p => p.map(c => c.id === id ? u : c)); } } catch {}
  };

  const toggleAuto = async (id: string) => {
    try { const r = await fetch(`${API}/ssl/certificates/${id}/auto-renew`, { method: "PATCH", credentials: "include" }); if (r.ok) { const u = await r.json(); setCerts(p => p.map(c => c.id === id ? u : c)); } } catch {}
  };

  const detail = certs.find(c => c.id === selected);

  return (
    <div className="h-full flex flex-col bg-background" data-testid="ssl-monitor">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">SSL Certificate Monitor</span></div>
        <div className="flex items-center gap-1">
          <button onClick={load} className="p-0.5 hover:bg-muted rounded"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : !selected ? (
          <div className="space-y-2">
            {certs.map(c => {
              const cfg = STATUS_CFG[c.status] || STATUS_CFG.valid;
              const Icon = cfg.icon;
              const days = daysUntil(c.expiresAt);
              return (
                <button key={c.id} onClick={() => { setSelected(c.id); setTab("overview"); }} className="w-full text-left bg-card/50 rounded-lg border border-border/30 p-2.5 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${cfg.color}`} /><span className="text-xs font-medium">{c.domain}</span></div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[10px]">
                    <div><span className="text-muted-foreground">Issuer:</span> <span className="font-medium">{c.issuer}</span></div>
                    <div><span className="text-muted-foreground">Expires:</span> <span className={`font-medium ${days <= 0 ? "text-red-400" : days <= 30 ? "text-yellow-400" : "text-green-400"}`}>{days <= 0 ? `${Math.abs(days)}d ago` : `${days}d`}</span></div>
                    <div><span className="text-muted-foreground">Chain:</span> <span className={c.chainValid ? "text-green-400" : "text-red-400"}>{c.chainValid ? "Valid" : "Invalid"}</span></div>
                    <div><span className="text-muted-foreground">Auto-renew:</span> <span className={c.autoRenew ? "text-green-400" : "text-muted-foreground"}>{c.autoRenew ? "On" : "Off"}</span></div>
                  </div>
                  <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${days <= 0 ? "bg-red-400" : days <= 30 ? "bg-yellow-400" : "bg-green-400"}`} style={{ width: `${Math.max(0, Math.min(100, (days / 90) * 100))}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : detail && (
          <div className="space-y-3">
            <button onClick={() => setSelected("")} className="text-[10px] text-primary hover:underline">&larr; Back to all certificates</button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => { const cfg = STATUS_CFG[detail.status]; const I = cfg.icon; return <I className={`w-4 h-4 ${cfg.color}`} />; })()}
                <span className="text-sm font-medium">{detail.domain}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => renew(detail.id)} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-primary/10 text-primary rounded hover:bg-primary/20"><RotateCcw className="w-3 h-3" /> Renew</button>
                <button onClick={() => toggleAuto(detail.id)} className="flex items-center gap-1 px-2 py-1 text-[10px] border border-border/30 rounded hover:bg-muted/50">
                  {detail.autoRenew ? <ToggleRight className="w-3 h-3 text-green-400" /> : <ToggleLeft className="w-3 h-3" />} Auto-renew
                </button>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setTab("overview")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "overview" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Details</button>
              <button onClick={() => setTab("history")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "history" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Renewal History</button>
            </div>
            {tab === "overview" && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Issuer", value: detail.issuer },
                  { label: "Status", value: STATUS_CFG[detail.status]?.label },
                  { label: "Issued", value: fmtDate(detail.issuedAt) },
                  { label: "Expires", value: fmtDate(detail.expiresAt) },
                  { label: "Days Remaining", value: `${daysUntil(detail.expiresAt)}` },
                  { label: "Chain Valid", value: detail.chainValid ? "Yes" : "No" },
                  { label: "Auto-Renew", value: detail.autoRenew ? "Enabled" : "Disabled" },
                  { label: "Last Checked", value: fmtDate(detail.lastChecked) },
                ].map((item, i) => (
                  <div key={i} className="bg-card/50 rounded border border-border/30 p-2">
                    <div className="text-[9px] text-muted-foreground">{item.label}</div>
                    <div className="text-[11px] font-medium">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
            {tab === "history" && (
              <div className="space-y-1.5">
                {detail.renewalHistory.slice().reverse().map((ev: any) => (
                  <div key={ev.id} className={`flex items-start gap-2 rounded border p-2 text-[10px] ${ev.success ? "border-border/30" : "border-red-400/30 bg-red-400/5"}`}>
                    <Clock className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{ev.details}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{fmtDate(ev.timestamp)} · {ev.action.replace(/_/g, " ")}</div>
                    </div>
                    {ev.success ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
