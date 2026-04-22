import { useState, useEffect } from "react";
import { X, DollarSign, TrendingDown, Loader2, AlertTriangle, Zap } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

export function CostOptimizer({ projectId, onClose }: Props) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch(`${API}/projects/${projectId}/costs`, { credentials: "include" }).then(r => r.json()).then(setReport).finally(() => setLoading(false)); }, [projectId]);

  if (loading) return <div className="h-full flex items-center justify-center bg-background"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="cost-optimizer">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><DollarSign className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Cost Optimizer</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      {report && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><div className="text-lg font-bold">${report.totalMonthlyCost}</div><div className="text-[10px] text-muted-foreground">Current/mo</div></div>
            <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><div className="text-lg font-bold text-green-400">${report.optimizedCost}</div><div className="text-[10px] text-muted-foreground">Optimized/mo</div></div>
            <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><div className="text-lg font-bold text-green-400"><TrendingDown className="w-4 h-4 inline" /> ${report.totalSavings}</div><div className="text-[10px] text-muted-foreground">Savings/mo</div></div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Resources</div>
            {report.resources?.map((r: any) => (
              <div key={r.resource} className="flex items-center gap-2 bg-card/50 rounded p-2 border border-border/30 text-xs">
                <span className="flex-1 font-medium">{r.resource}</span>
                <span className="text-muted-foreground">{r.current}{r.unit}</span>
                {r.savings > 0 && <><span className="text-muted-foreground">→</span><span className="text-green-400">{r.recommended}{r.unit}</span><span className="text-green-400 font-bold">-${r.savings}</span></>}
              </div>
            ))}
          </div>
          {report.recommendations?.map((r: any, i: number) => (
            <div key={i} className="flex gap-2 bg-card/50 rounded p-2 border border-border/30 text-xs">
              <Zap className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${r.impact === "high" ? "text-red-400" : r.impact === "medium" ? "text-yellow-400" : "text-blue-400"}`} />
              <div><div className="font-medium">{r.title}</div><div className="text-[10px] text-muted-foreground">{r.description}</div><div className="text-[10px] text-green-400 mt-0.5">Save ${r.savings}/mo</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
