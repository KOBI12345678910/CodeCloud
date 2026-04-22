import { useState, useEffect } from "react";
import { X, Globe, Power, PowerOff, Plus, Loader2, ArrowLeftRight } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const TYPE_COLORS: Record<string, string> = { weight: "bg-blue-400/10 text-blue-400", header: "bg-purple-400/10 text-purple-400", cookie: "bg-orange-400/10 text-orange-400", geo: "bg-green-400/10 text-green-400", time: "bg-cyan-400/10 text-cyan-400" };

export function TrafficRules({ projectId, onClose }: Props) {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const res = await fetch(`${API}/projects/${projectId}/traffic-rules`, { credentials: "include" }); if (res.ok) setRules(await res.json()); } catch {} finally { setLoading(false); }
    })();
  }, [projectId]);

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await fetch(`${API}/projects/${projectId}/traffic-rules/${ruleId}/toggle`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
      setRules(rules.map(r => r.id === ruleId ? { ...r, enabled } : r));
    } catch {}
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="traffic-rules">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><ArrowLeftRight className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Traffic Shaping</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
          <>
            {rules.map(rule => (
              <div key={rule.id} className="bg-card/50 rounded-lg border border-border/30 p-2.5">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleRule(rule.id, !rule.enabled)} className={`p-0.5 rounded ${rule.enabled ? "text-green-400" : "text-muted-foreground"}`}>
                    {rule.enabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-xs font-medium flex-1">{rule.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${TYPE_COLORS[rule.type] || ""}`}>{rule.type}</span>
                  <span className="text-[10px] text-muted-foreground">P{rule.priority}</span>
                </div>
                {rule.conditions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {rule.conditions.map((c: any, i: number) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 bg-muted/50 rounded font-mono">{c.field} {c.operator} {c.value}</span>
                    ))}
                  </div>
                )}
                <div className="mt-1.5 flex gap-1.5">
                  {rule.targets.map((t: any, i: number) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] bg-muted/30 rounded px-1.5 py-0.5">
                      <Globe className="w-2.5 h-2.5 text-muted-foreground" />
                      <span className="font-mono">{t.deploymentId}</span>
                      <span className="text-primary font-bold">{t.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
