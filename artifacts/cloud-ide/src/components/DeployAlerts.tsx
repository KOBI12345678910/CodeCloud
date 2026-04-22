import { useState, useEffect } from "react";
import { X, Bell, AlertTriangle, AlertOctagon, Info, CheckCircle2, Loader2 } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

export function DeployAlerts({ projectId, onClose }: Props) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/projects/${projectId}/alerts/active`, { credentials: "include" }).then(r => r.json()),
      fetch(`${API}/projects/${projectId}/alerts/rules`, { credentials: "include" }).then(r => r.json()),
    ]).then(([a, r]) => { setAlerts(a); setRules(r); }).finally(() => setLoading(false));
  }, [projectId]);

  const severityIcon = (s: string) => s === "critical" ? <AlertOctagon className="w-3.5 h-3.5 text-red-400" /> : s === "warning" ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" /> : <Info className="w-3.5 h-3.5 text-blue-400" />;

  if (loading) return <div className="h-full flex items-center justify-center bg-background"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="deploy-alerts">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Deploy Alerts</span>
          {alerts.filter(a => a.status === "firing").length > 0 && <span className="px-1.5 py-0.5 text-[10px] bg-red-400/10 text-red-400 rounded font-bold">{alerts.filter(a => a.status === "firing").length} firing</span>}
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {alerts.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Alerts</div>
            {alerts.map((a: any) => (
              <div key={a.id} className={`flex items-start gap-2 rounded-lg p-2 border ${a.severity === "critical" ? "bg-red-400/5 border-red-400/20" : "bg-yellow-400/5 border-yellow-400/20"}`}>
                {severityIcon(a.severity)}
                <div className="flex-1">
                  <div className="text-xs font-medium">{a.ruleName}</div>
                  <div className="text-[10px] text-muted-foreground">{a.message}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Since {new Date(a.firedAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Alert Rules</div>
          {rules.map((r: any) => (
            <div key={r.id} className="flex items-center gap-2 bg-card/50 rounded p-2 border border-border/30 text-xs">
              {severityIcon(r.severity)}
              <span className="flex-1 font-medium">{r.name}</span>
              <span className="text-[10px] text-muted-foreground">{r.channels.join(", ")}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] ${r.enabled ? "bg-green-400/10 text-green-400" : "bg-muted text-muted-foreground"}`}>{r.enabled ? "On" : "Off"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
