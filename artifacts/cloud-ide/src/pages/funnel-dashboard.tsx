import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, BarChart3, Loader2, AlertTriangle, TrendingDown, Lightbulb, ArrowDown, Users, Rocket, Code2, UserPlus, Globe } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

const STEP_ICONS: Record<string, any> = { visit: Globe, signup: UserPlus, create_project: Code2, run_code: Rocket, deploy: Rocket };
const STEP_COLORS = ["bg-blue-400", "bg-green-400", "bg-purple-400", "bg-orange-400", "bg-cyan-400"];

export default function FunnelDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const res = await fetch(`${API}/analytics/funnel?period=${period}`, { credentials: "include" }); if (res.ok) setData(await res.json()); } catch {} finally { setLoading(false); }
    })();
  }, [period]);

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="funnel-dashboard">
      <header className="border-b border-border/50 bg-card/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs"><ArrowLeft className="w-3.5 h-3.5" /> Back</Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /><h1 className="text-sm font-semibold">Analytics Funnel</h1></div>
          </div>
          <div className="flex items-center gap-2">
            {["7d", "30d", "90d"].map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs rounded ${period === p ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}>{p}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div> : data && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card/50 rounded-lg border border-border/30 p-4 text-center">
                <Users className="w-5 h-5 mx-auto text-primary mb-1" />
                <div className="text-2xl font-bold">{data.totalVisitors.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Visitors</div>
              </div>
              <div className="bg-card/50 rounded-lg border border-border/30 p-4 text-center">
                <Rocket className="w-5 h-5 mx-auto text-green-400 mb-1" />
                <div className="text-2xl font-bold">{data.steps[data.steps.length - 1].visitors.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Completed Deploys</div>
              </div>
              <div className="bg-card/50 rounded-lg border border-border/30 p-4 text-center">
                <TrendingDown className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
                <div className="text-2xl font-bold">{data.overallConversion}%</div>
                <div className="text-xs text-muted-foreground">Overall Conversion</div>
              </div>
            </div>

            <div className="bg-card/50 rounded-lg border border-border/30 p-5">
              <h2 className="text-sm font-semibold mb-4">Conversion Funnel</h2>
              <div className="space-y-1">
                {data.steps.map((step: any, i: number) => {
                  const widthPct = Math.max(8, (step.visitors / data.totalVisitors) * 100);
                  return (
                    <div key={step.id}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs text-muted-foreground w-6 text-right">{step.order}</span>
                        <span className="text-xs font-medium w-40">{step.name}</span>
                        <div className="flex-1 relative">
                          <div className={`${STEP_COLORS[i]} rounded h-8 flex items-center justify-end pr-2 transition-all`} style={{ width: `${widthPct}%` }}>
                            <span className="text-[10px] font-bold text-white">{step.visitors.toLocaleString()}</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">{step.conversionRate}%</span>
                      </div>
                      {i < data.steps.length - 1 && step.dropoffRate > 0 && (
                        <div className="flex items-center gap-3 ml-9 mb-1">
                          <ArrowDown className="w-3 h-3 text-red-400/60" />
                          <span className="text-[10px] text-red-400/80">-{step.dropoffRate}% dropoff</span>
                          <span className="text-[10px] text-muted-foreground">({step.topDropoffReasons.slice(0, 2).join(", ")})</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {data.bottlenecks.length > 0 && (
              <div className="bg-card/50 rounded-lg border border-border/30 p-5">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400" /> Bottleneck Analysis</h2>
                <div className="space-y-3">
                  {data.bottlenecks.map((b: any) => (
                    <div key={b.stepId} className={`rounded-lg p-3 border ${b.severity === "high" ? "bg-red-400/5 border-red-400/20" : b.severity === "medium" ? "bg-yellow-400/5 border-yellow-400/20" : "bg-muted/50 border-border/30"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${b.severity === "high" ? "bg-red-400/10 text-red-400" : b.severity === "medium" ? "bg-yellow-400/10 text-yellow-400" : "bg-muted text-muted-foreground"}`}>{b.severity}</span>
                        <span className="text-xs font-medium">{b.stepName}</span>
                        <span className="text-xs text-red-400 ml-auto">-{b.dropoffPercent}% dropoff</span>
                      </div>
                      <div className="flex items-start gap-2 mt-1.5">
                        <Lightbulb className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                        <div><div className="text-xs">{b.suggestion}</div><div className="text-[10px] text-muted-foreground mt-0.5">{b.estimatedImpact}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card/50 rounded-lg border border-border/30 p-5">
              <h2 className="text-sm font-semibold mb-3">Daily Trends</h2>
              <div className="flex items-end gap-[2px] h-24">
                {data.trends.map((t: any, i: number) => {
                  const maxVisitors = Math.max(...data.trends.map((tr: any) => tr.visitors));
                  const h = (t.visitors / maxVisitors) * 100;
                  return <div key={i} className="flex-1 bg-primary/40 hover:bg-primary/60 rounded-t transition-colors" style={{ height: `${h}%` }} title={`${t.date}: ${t.visitors} visitors, ${t.signups} signups, ${t.deploys} deploys`} />;
                })}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground"><span>{data.trends[0]?.date}</span><span>{data.trends[data.trends.length - 1]?.date}</span></div>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                <span>Avg daily: <strong className="text-foreground">{Math.round(data.trends.reduce((s: number, t: any) => s + t.visitors, 0) / data.trends.length).toLocaleString()}</strong> visitors</span>
                <span><strong className="text-foreground">{Math.round(data.trends.reduce((s: number, t: any) => s + t.signups, 0) / data.trends.length)}</strong> signups</span>
                <span><strong className="text-foreground">{Math.round(data.trends.reduce((s: number, t: any) => s + t.deploys, 0) / data.trends.length)}</strong> deploys</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
