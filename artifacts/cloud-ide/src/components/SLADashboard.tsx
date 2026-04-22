import { useState, useEffect } from "react";
import { X, Shield, CheckCircle2, AlertTriangle, XCircle, Loader2, Clock } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

export function SLADashboard({ projectId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const res = await fetch(`${API}/projects/${projectId}/sla`, { credentials: "include" }); if (res.ok) setData(await res.json()); } catch {} finally { setLoading(false); }
    })();
  }, [projectId]);

  const statusIcon = (s: string) => s === "met" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : s === "at_risk" ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="sla-dashboard">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">SLA Monitor</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div> : data && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {data.targets.map((t: any) => (
              <div key={t.metric} className="bg-card/50 rounded-lg border border-border/30 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">{statusIcon(t.status)}<span className="text-[10px] capitalize">{t.metric.replace("_", " ")}</span></div>
                <div className="text-sm font-bold">{typeof t.current === "number" ? (t.current % 1 ? t.current.toFixed(2) : t.current) : t.current}{t.unit}</div>
                <div className="text-[9px] text-muted-foreground">Target: {t.target}{t.unit}</div>
                <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${t.status === "met" ? "bg-green-400" : t.status === "at_risk" ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${Math.min(100, (t.current / t.target) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="bg-card/50 rounded-lg border border-border/30 p-3">
            <div className="text-[10px] text-muted-foreground mb-1.5">Uptime History (30 days)</div>
            <div className="flex items-end gap-[2px] h-12">
              {data.uptimeHistory.map((d: any, i: number) => {
                const h = ((d.uptime - 99) / 1) * 100;
                return <div key={i} className={`flex-1 rounded-t ${d.uptime >= 99.9 ? "bg-green-400/60" : d.uptime >= 99.5 ? "bg-yellow-400/60" : "bg-red-400/60"}`} style={{ height: `${Math.max(5, h)}%` }} title={`${d.date}: ${d.uptime.toFixed(2)}%`} />;
              })}
            </div>
          </div>
          {data.breaches.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">SLA Breaches</div>
              {data.breaches.map((b: any, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-red-400/5 border border-red-400/20 rounded p-2 text-[10px]">
                  <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="capitalize">{b.metric}</span>
                  <span className="text-muted-foreground">{b.value}% (target: {b.target}%)</span>
                  <span className="text-muted-foreground ml-auto">{b.duration}min downtime</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
