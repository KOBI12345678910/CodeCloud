import { useState, useEffect } from "react";
import { X, Tag, Loader2, DollarSign } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const TAG_COLORS = ["bg-blue-400/10 text-blue-400", "bg-green-400/10 text-green-400", "bg-purple-400/10 text-purple-400", "bg-orange-400/10 text-orange-400", "bg-cyan-400/10 text-cyan-400", "bg-pink-400/10 text-pink-400"];

export function CostTags({ projectId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const res = await fetch(`${API}/projects/${projectId}/cost-tags`, { credentials: "include" }); if (res.ok) setData(await res.json()); } catch {} finally { setLoading(false); }
    })();
  }, [projectId]);

  return (
    <div className="h-full flex flex-col bg-background" data-testid="cost-tags">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Tag className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Cost Tags</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div> : data && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="bg-card/50 rounded-lg border border-border/30 p-3 text-center">
            <DollarSign className="w-4 h-4 mx-auto text-primary mb-1" />
            <div className="text-lg font-bold">${data.totalCost.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">{data.period} Total</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost by Tag</div>
            {data.tags.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-card/50 rounded border border-border/30 p-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${TAG_COLORS[i % TAG_COLORS.length]}`}>{t.key}: {t.value}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary/60 rounded-full" style={{ width: `${(t.totalCost / data.totalCost) * 100}%` }} /></div>
                <span className="text-xs font-bold">${t.totalCost}</span>
                <span className="text-[9px] text-muted-foreground">{t.resources} resources</span>
              </div>
            ))}
          </div>
          {data.budgets.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Budgets</div>
              {data.budgets.map((b: any, i: number) => (
                <div key={i} className="bg-card/50 rounded border border-border/30 p-2">
                  <div className="flex items-center justify-between text-[10px] mb-1"><span>{b.tagKey}: {b.tagValue}</span><span className={b.remaining < b.budget * 0.1 ? "text-red-400" : "text-muted-foreground"}>${b.remaining} remaining</span></div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${b.spent / b.budget > 0.9 ? "bg-red-400" : b.spent / b.budget > 0.7 ? "bg-yellow-400" : "bg-green-400"}`} style={{ width: `${(b.spent / b.budget) * 100}%` }} /></div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5"><span>${b.spent} spent</span><span>${b.budget} budget</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
