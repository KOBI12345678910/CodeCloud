import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Users, ArrowLeft, Loader2, BarChart3 } from "lucide-react";
import { Link } from "wouter";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

function fmt(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function pct(n: number): string { return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`; }

function Sparkline({ data, color = "#60a5fa", height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return <div className="h-3 rounded-full bg-muted/30 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} /></div>;
}

export default function RevenueAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "plans" | "regions" | "cohorts" | "forecast">("overview");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/admin/revenue`, { credentials: "include" });
        if (r.ok) setData(await r.json());
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return <div className="flex items-center justify-center h-screen text-muted-foreground">Failed to load revenue data</div>;

  const maxPlanRev = Math.max(...data.revenueByPlan.map((p: any) => p.revenue), 1);
  const maxRegionRev = Math.max(...data.revenueByRegion.map((r: any) => r.revenue), 1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/50 bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/"><a className="p-1 hover:bg-muted rounded"><ArrowLeft className="w-4 h-4" /></a></Link>
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Revenue Analytics</span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "MRR", value: fmt(data.mrr), sub: pct(data.mrrGrowth), up: data.mrrGrowth > 0 },
            { label: "ARR", value: fmt(data.arr), sub: `${data.totalCustomers.toLocaleString()} customers`, up: true },
            { label: "Churn Rate", value: `${data.churnRate}%`, sub: `${data.churned} churned`, up: false },
            { label: "LTV", value: fmt(data.ltv), sub: `ARPU: ${fmt(data.arpu)}`, up: true },
          ].map(m => (
            <div key={m.label} className="bg-card/50 rounded-xl border border-border/30 p-4">
              <div className="text-[11px] text-muted-foreground mb-1">{m.label}</div>
              <div className="text-xl font-bold">{m.value}</div>
              <div className={`text-[10px] flex items-center gap-0.5 mt-1 ${m.label === "Churn Rate" ? "text-red-400" : m.up ? "text-green-400" : "text-muted-foreground"}`}>
                {m.label === "Churn Rate" ? <TrendingDown className="w-3 h-3" /> : m.up ? <TrendingUp className="w-3 h-3" /> : null}
                {m.sub}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card/50 rounded-xl border border-border/30 p-4">
            <div className="text-[11px] text-muted-foreground mb-1">Net New MRR</div>
            <div className="text-lg font-bold text-green-400">{fmt(data.netNewMRR)}</div>
          </div>
          <div className="bg-card/50 rounded-xl border border-border/30 p-4">
            <div className="text-[11px] text-muted-foreground mb-1">Expansion Revenue</div>
            <div className="text-lg font-bold text-blue-400">{fmt(data.expansionRevenue)}</div>
          </div>
          <div className="bg-card/50 rounded-xl border border-border/30 p-4">
            <div className="text-[11px] text-muted-foreground mb-1">Contraction Revenue</div>
            <div className="text-lg font-bold text-red-400">{fmt(data.contractionRevenue)}</div>
          </div>
        </div>
        <div className="flex gap-1 border-b border-border/30">
          {(["overview", "plans", "regions", "cohorts", "forecast"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-xs capitalize border-b-2 ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>
        {tab === "overview" && (
          <div className="bg-card/50 rounded-xl border border-border/30 p-5">
            <div className="text-xs font-medium mb-3">MRR History</div>
            <div className="h-40 mb-4">
              <Sparkline data={data.mrrHistory.map((h: any) => h.mrr)} color="#60a5fa" height={160} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead><tr className="border-b border-border/30">
                  <th className="text-left p-2 font-normal text-muted-foreground">Month</th>
                  <th className="text-right p-2 font-normal text-muted-foreground">MRR</th>
                  <th className="text-right p-2 font-normal text-muted-foreground">New</th>
                  <th className="text-right p-2 font-normal text-muted-foreground">Churned</th>
                  <th className="text-right p-2 font-normal text-muted-foreground">Expansion</th>
                  <th className="text-right p-2 font-normal text-muted-foreground">Contraction</th>
                </tr></thead>
                <tbody>
                  {data.mrrHistory.map((h: any) => (
                    <tr key={h.month} className="border-b border-border/20 hover:bg-muted/10">
                      <td className="p-2 font-mono">{h.month}</td>
                      <td className="p-2 text-right font-medium">{fmt(h.mrr)}</td>
                      <td className="p-2 text-right text-green-400">{fmt(h.newMRR)}</td>
                      <td className="p-2 text-right text-red-400">-{fmt(h.churnedMRR)}</td>
                      <td className="p-2 text-right text-blue-400">{fmt(h.expansionMRR)}</td>
                      <td className="p-2 text-right text-yellow-400">-{fmt(h.contractionMRR)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab === "plans" && (
          <div className="bg-card/50 rounded-xl border border-border/30 p-5 space-y-4">
            <div className="text-xs font-medium">Revenue by Plan</div>
            {data.revenueByPlan.map((p: any) => (
              <div key={p.plan} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">{p.plan}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{p.customers.toLocaleString()} customers</span>
                    <span className="font-medium">{fmt(p.revenue)}</span>
                    <span className="text-muted-foreground w-12 text-right">{p.percentage}%</span>
                  </div>
                </div>
                <Bar value={p.revenue} max={maxPlanRev} color={p.plan === "Free" ? "#6b7280" : p.plan === "Pro" ? "#3b82f6" : "#8b5cf6"} />
              </div>
            ))}
          </div>
        )}
        {tab === "regions" && (
          <div className="bg-card/50 rounded-xl border border-border/30 p-5 space-y-4">
            <div className="text-xs font-medium">Revenue by Region</div>
            {data.revenueByRegion.map((r: any) => (
              <div key={r.region} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">{r.region}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{r.customers.toLocaleString()} customers</span>
                    <span className="font-medium">{fmt(r.revenue)}</span>
                    <span className="text-muted-foreground w-12 text-right">{r.percentage}%</span>
                  </div>
                </div>
                <Bar value={r.revenue} max={maxRegionRev} color={["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#6b7280"][data.revenueByRegion.indexOf(r) % 5]} />
              </div>
            ))}
          </div>
        )}
        {tab === "cohorts" && (
          <div className="bg-card/50 rounded-xl border border-border/30 p-5">
            <div className="text-xs font-medium mb-3">Cohort Retention (%)</div>
            <table className="w-full text-[10px]">
              <thead><tr className="border-b border-border/30">
                <th className="text-left p-2 font-normal text-muted-foreground">Cohort</th>
                {[0, 1, 2, 3, 4, 5].map(m => <th key={m} className="text-center p-2 font-normal text-muted-foreground">M{m}</th>)}
              </tr></thead>
              <tbody>
                {data.cohorts.map((c: any) => (
                  <tr key={c.cohort} className="border-b border-border/20">
                    <td className="p-2 font-mono">{c.cohort}</td>
                    {[c.month0, c.month1, c.month2, c.month3, c.month4, c.month5].map((v: number, i: number) => (
                      <td key={i} className="p-2 text-center">
                        {v > 0 ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] ${v >= 90 ? "bg-green-400/20 text-green-400" : v >= 75 ? "bg-blue-400/20 text-blue-400" : v >= 50 ? "bg-yellow-400/20 text-yellow-400" : "bg-red-400/20 text-red-400"}`}>{v}%</span>
                        ) : <span className="text-muted-foreground/30">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "forecast" && (
          <div className="bg-card/50 rounded-xl border border-border/30 p-5">
            <div className="text-xs font-medium mb-3">Revenue Forecast</div>
            <div className="h-32 mb-4">
              <Sparkline data={[...data.mrrHistory.map((h: any) => h.mrr), ...data.forecast.map((f: any) => f.projected)]} color="#8b5cf6" height={128} />
            </div>
            <table className="w-full text-[10px]">
              <thead><tr className="border-b border-border/30">
                <th className="text-left p-2 font-normal text-muted-foreground">Month</th>
                <th className="text-right p-2 font-normal text-muted-foreground">Projected</th>
                <th className="text-right p-2 font-normal text-muted-foreground">Low</th>
                <th className="text-right p-2 font-normal text-muted-foreground">High</th>
                <th className="text-right p-2 font-normal text-muted-foreground">Range</th>
              </tr></thead>
              <tbody>
                {data.forecast.map((f: any) => (
                  <tr key={f.month} className="border-b border-border/20 hover:bg-muted/10">
                    <td className="p-2 font-mono">{f.month}</td>
                    <td className="p-2 text-right font-medium text-purple-400">{fmt(f.projected)}</td>
                    <td className="p-2 text-right text-muted-foreground">{fmt(f.low)}</td>
                    <td className="p-2 text-right text-muted-foreground">{fmt(f.high)}</td>
                    <td className="p-2 text-right text-[9px] text-muted-foreground">±{fmt((f.high - f.low) / 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
