import { useState, useEffect } from "react";
import { X, BarChart3, Loader2, Star, TrendingUp, TrendingDown, Minus, MessageSquare, FlaskConical } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { onClose: () => void; }

const TREND_ICON = { up: TrendingUp, down: TrendingDown, stable: Minus };
const TREND_COLOR = { up: "text-green-400", down: "text-red-400", stable: "text-muted-foreground" };
const CAT_COLORS: Record<string, string> = { frontend: "bg-blue-400/10 text-blue-400", backend: "bg-green-400/10 text-green-400", fullstack: "bg-purple-400/10 text-purple-400" };

export function TemplateAnalytics({ onClose }: Props) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [abTests, setAbTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"usage" | "feedback" | "abtests">("usage");

  useEffect(() => {
    (async () => {
      try {
        const [tRes, aRes] = await Promise.all([
          fetch(`${API}/templates/analytics`, { credentials: "include" }),
          fetch(`${API}/templates/ab-tests`, { credentials: "include" }),
        ]);
        if (tRes.ok) setTemplates(await tRes.json());
        if (aRes.ok) setAbTests(await aRes.json());
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const maxUsage = Math.max(...templates.map(t => t.usageCount), 1);

  return (
    <div className="h-full flex flex-col bg-background" data-testid="template-analytics">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Template Analytics</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        {(["usage", "feedback", "abtests"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-2.5 py-1 text-[10px] rounded ${tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
            {t === "usage" ? "Usage" : t === "feedback" ? "Feedback" : "A/B Tests"}
          </button>
        ))}
      </div>
      {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {tab === "usage" && templates.map(t => {
            const TrendIcon = TREND_ICON[t.trend as keyof typeof TREND_ICON];
            return (
              <div key={t.templateId} className="bg-card/50 rounded-lg border border-border/30 p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium flex-1">{t.templateName}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded ${CAT_COLORS[t.category] || "bg-muted text-muted-foreground"}`}>{t.category}</span>
                  <div className={`flex items-center gap-0.5 text-[10px] ${TREND_COLOR[t.trend as keyof typeof TREND_COLOR]}`}>
                    <TrendIcon className="w-3 h-3" />{Math.abs(t.trendPercent)}%
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-1">
                  <span>{t.usageCount.toLocaleString()} uses</span>
                  <span>{t.uniqueUsers.toLocaleString()} users</span>
                  <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />{t.avgRating}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/50 rounded-full" style={{ width: `${(t.usageCount / maxUsage) * 100}%` }} />
                </div>
              </div>
            );
          })}

          {tab === "feedback" && templates.filter(t => t.feedback.length > 0).map(t => (
            <div key={t.templateId} className="space-y-1">
              <div className="text-[10px] text-muted-foreground font-medium">{t.templateName}</div>
              {t.feedback.map((f: any) => (
                <div key={f.id} className="bg-card/50 rounded border border-border/30 p-2 flex items-start gap-2">
                  <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-2 h-2 ${i < f.rating ? "text-yellow-400 fill-yellow-400" : "text-muted"}`} />)}</div>
                      <span className="text-[9px] text-muted-foreground">{new Date(f.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[10px]">{f.comment}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {tab === "abtests" && abTests.map(test => {
            const rateA = ((test.variantA.conversions / test.variantA.impressions) * 100).toFixed(1);
            const rateB = ((test.variantB.conversions / test.variantB.impressions) * 100).toFixed(1);
            return (
              <div key={test.id} className="bg-card/50 rounded-lg border border-border/30 p-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium flex-1">{templates.find(t => t.templateId === test.templateId)?.templateName || test.templateId}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded ${test.status === "running" ? "bg-green-400/10 text-green-400" : test.status === "completed" ? "bg-blue-400/10 text-blue-400" : "bg-yellow-400/10 text-yellow-400"}`}>{test.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded border p-2 ${test.winner === "A" ? "border-green-400/50 bg-green-400/5" : "border-border/30"}`}>
                    <div className="text-[9px] text-muted-foreground mb-0.5">Variant A {test.winner === "A" && <span className="text-green-400">Winner</span>}</div>
                    <div className="text-[10px] mb-1 line-clamp-2">{test.variantA.description}</div>
                    <div className="text-xs font-bold">{rateA}% <span className="text-[9px] font-normal text-muted-foreground">conversion</span></div>
                  </div>
                  <div className={`rounded border p-2 ${test.winner === "B" ? "border-green-400/50 bg-green-400/5" : "border-border/30"}`}>
                    <div className="text-[9px] text-muted-foreground mb-0.5">Variant B {test.winner === "B" && <span className="text-green-400">Winner</span>}</div>
                    <div className="text-[10px] mb-1 line-clamp-2">{test.variantB.description}</div>
                    <div className="text-xs font-bold">{rateB}% <span className="text-[9px] font-normal text-muted-foreground">conversion</span></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
