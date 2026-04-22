import { useState, useEffect } from "react";
import { X, TrendingUp, AlertTriangle, Loader2, Zap, ArrowUp } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

export function ResourceForecast({ projectId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState<"cpu" | "memory" | "storage" | "bandwidth">("cpu");

  useEffect(() => {
    (async () => {
      try { const res = await fetch(`${API}/projects/${projectId}/forecast?days=30`, { credentials: "include" }); if (res.ok) setData(await res.json()); } catch {} finally { setLoading(false); }
    })();
  }, [projectId]);

  const maxVal = data ? Math.max(...data.predicted.map((p: any) => p[resource])) : 100;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="resource-forecast">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Resource Forecast</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div> : data && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {(["cpu", "memory", "storage", "bandwidth"] as const).map(r => (
              <button key={r} onClick={() => setResource(r)} className={`rounded p-2 border text-center ${resource === r ? "border-primary bg-primary/10" : "border-border/30 bg-card/50"}`}>
                <div className="text-sm font-bold">{Math.round(data.currentUsage[r])}%</div>
                <div className="text-[10px] text-muted-foreground capitalize">{r}</div>
              </button>
            ))}
          </div>
          <div className="bg-card/50 rounded-lg border border-border/30 p-3">
            <div className="text-[10px] text-muted-foreground mb-2 capitalize">{resource} — 30 Day Forecast</div>
            <div className="flex items-end gap-[2px] h-20">
              {data.predicted.map((p: any, i: number) => {
                const val = p[resource];
                const color = val > 85 ? "bg-red-400" : val > 70 ? "bg-yellow-400" : "bg-primary/60";
                return <div key={i} className={`flex-1 ${color} rounded-t hover:opacity-80 transition-opacity`} style={{ height: `${(val / Math.max(maxVal, 100)) * 100}%`, minHeight: "2px" }} title={`${p.date}: ${Math.round(val)}% (${p.confidence}% confidence)`} />;
              })}
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground"><span>Today</span><span>+30 days</span></div>
          </div>
          {data.planUpgradeNeeded && (
            <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-2.5">
              <ArrowUp className="w-4 h-4 text-yellow-400 shrink-0" />
              <div><div className="text-xs font-medium text-yellow-400">Plan Upgrade Recommended</div><div className="text-[10px] text-muted-foreground">Estimated upgrade needed by {data.estimatedUpgradeDate}</div></div>
            </div>
          )}
          {data.recommendations.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Recommendations</div>
              {data.recommendations.map((r: any, i: number) => (
                <div key={i} className={`flex items-start gap-2 rounded p-2 border text-xs ${r.urgency === "high" ? "bg-red-400/5 border-red-400/20" : r.urgency === "medium" ? "bg-yellow-400/5 border-yellow-400/20" : "bg-card/50 border-border/30"}`}>
                  {r.type === "alert" ? <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" /> : <Zap className="w-3 h-3 text-primary mt-0.5 shrink-0" />}
                  <div><div className="font-medium">{r.resource}: {r.message}</div><div className="text-[10px] text-muted-foreground">Impact: {r.estimatedImpact}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
