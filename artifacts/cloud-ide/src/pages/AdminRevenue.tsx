import React, { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, Users, CreditCard,
  BarChart3, PieChart, Globe, Calendar, Download, Filter, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus, ChevronDown, Target, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";

interface RevenueMetric {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

interface CohortRow {
  cohort: string;
  month0: number;
  month1: number;
  month2: number;
  month3: number;
  month4: number;
  month5: number;
}

interface PlanDistribution {
  plan: string;
  users: number;
  revenue: number;
  color: string;
}

interface GeoRevenue {
  region: string;
  revenue: number;
  users: number;
  growth: number;
}

interface MonthlyRevenue {
  month: string;
  mrr: number;
  newRevenue: number;
  expansionRevenue: number;
  contractionRevenue: number;
  churnRevenue: number;
}

const MONTHLY_DATA: MonthlyRevenue[] = [
  { month: "Nov 2025", mrr: 142000, newRevenue: 18500, expansionRevenue: 8200, contractionRevenue: 2100, churnRevenue: 5800 },
  { month: "Dec 2025", mrr: 160800, newRevenue: 21300, expansionRevenue: 9500, contractionRevenue: 3200, churnRevenue: 6100 },
  { month: "Jan 2026", mrr: 182300, newRevenue: 24100, expansionRevenue: 11200, contractionRevenue: 2800, churnRevenue: 5500 },
  { month: "Feb 2026", mrr: 209300, newRevenue: 28900, expansionRevenue: 12500, contractionRevenue: 3100, churnRevenue: 6200 },
  { month: "Mar 2026", mrr: 241400, newRevenue: 33800, expansionRevenue: 14200, contractionRevenue: 3500, churnRevenue: 7100 },
  { month: "Apr 2026", mrr: 278800, newRevenue: 38200, expansionRevenue: 16800, contractionRevenue: 4100, churnRevenue: 8200 },
];

const COHORT_DATA: CohortRow[] = [
  { cohort: "Nov 2025", month0: 100, month1: 88, month2: 82, month3: 78, month4: 75, month5: 73 },
  { cohort: "Dec 2025", month0: 100, month1: 91, month2: 85, month3: 80, month4: 77, month5: 0 },
  { cohort: "Jan 2026", month0: 100, month1: 89, month2: 84, month3: 79, month4: 0, month5: 0 },
  { cohort: "Feb 2026", month0: 100, month1: 92, month2: 86, month3: 0, month4: 0, month5: 0 },
  { cohort: "Mar 2026", month0: 100, month1: 90, month2: 0, month3: 0, month4: 0, month5: 0 },
  { cohort: "Apr 2026", month0: 100, month1: 0, month2: 0, month3: 0, month4: 0, month5: 0 },
];

const PLAN_DATA: PlanDistribution[] = [
  { plan: "Free", users: 32450, revenue: 0, color: "bg-gray-400" },
  { plan: "Pro", users: 8920, revenue: 178400, color: "bg-blue-500" },
  { plan: "Team", users: 2340, revenue: 100440, color: "bg-purple-500" },
];

const GEO_DATA: GeoRevenue[] = [
  { region: "North America", revenue: 145200, users: 18400, growth: 14.2 },
  { region: "Europe", revenue: 78300, users: 12100, growth: 18.5 },
  { region: "Asia Pacific", revenue: 42100, users: 8200, growth: 28.3 },
  { region: "Latin America", revenue: 8900, users: 3400, growth: 22.1 },
  { region: "Middle East & Africa", revenue: 4300, users: 1610, growth: 31.5 },
];

const FORECAST_DATA = [
  { month: "May 2026", predicted: 318500, low: 295000, high: 342000 },
  { month: "Jun 2026", predicted: 361200, low: 328000, high: 394000 },
  { month: "Jul 2026", predicted: 407800, low: 362000, high: 453000 },
  { month: "Aug 2026", predicted: 458100, low: 398000, high: 518000 },
  { month: "Sep 2026", predicted: 512500, low: 435000, high: 590000 },
  { month: "Oct 2026", predicted: 571300, low: 474000, high: 668000 },
];

function formatCurrency(val: number): string {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

function formatNumber(val: number): string {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toString();
}

function ChangeIndicator({ value }: { value: number }): React.ReactElement {
  if (value > 0) return <span className="flex items-center gap-0.5 text-green-400 text-xs"><ArrowUpRight size={12} />+{value.toFixed(1)}%</span>;
  if (value < 0) return <span className="flex items-center gap-0.5 text-red-400 text-xs"><ArrowDownRight size={12} />{value.toFixed(1)}%</span>;
  return <span className="flex items-center gap-0.5 text-gray-400 text-xs"><Minus size={12} />0%</span>;
}

function MiniBarChart({ data, maxVal, color }: { data: number[]; maxVal: number; color: string }): React.ReactElement {
  return (
    <div className="flex items-end gap-px h-10">
      {data.map((val, i) => (
        <div key={i} className={`w-2 rounded-t ${color} transition-all`} style={{ height: `${(val / maxVal) * 100}%`, opacity: 0.4 + (i / data.length) * 0.6 }} />
      ))}
    </div>
  );
}

export default function AdminRevenue(): React.ReactElement {
  const { theme } = useTheme();
  const [timeRange, setTimeRange] = useState<"6m" | "12m" | "ytd" | "all">("6m");
  const [activeSection, setActiveSection] = useState<"overview" | "cohorts" | "forecast" | "geo">("overview");

  const currentMRR = MONTHLY_DATA[MONTHLY_DATA.length - 1].mrr;
  const previousMRR = MONTHLY_DATA[MONTHLY_DATA.length - 2].mrr;
  const mrrGrowth = ((currentMRR - previousMRR) / previousMRR) * 100;
  const arr = currentMRR * 12;
  const totalUsers = PLAN_DATA.reduce((s, p) => s + p.users, 0);
  const payingUsers = PLAN_DATA.filter(p => p.revenue > 0).reduce((s, p) => s + p.users, 0);
  const totalRevenue = PLAN_DATA.reduce((s, p) => s + p.revenue, 0);
  const arpu = totalRevenue / payingUsers;
  const ltv = arpu * 24;
  const cac = 45;
  const ltvCacRatio = ltv / cac;
  const churnRate = 4.2;
  const nrr = 112;

  const isDark = theme === "dark";
  const cardClass = isDark ? "bg-[#161b22] border-[#1e2533]" : "bg-white border-gray-200";
  const hoverClass = isDark ? "hover:bg-[#1c2230]" : "hover:bg-gray-50";

  const topMetrics: RevenueMetric[] = [
    { label: "Monthly Recurring Revenue", value: formatCurrency(currentMRR), change: mrrGrowth, changeLabel: "vs last month", icon: DollarSign, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Annual Run Rate", value: formatCurrency(arr), change: mrrGrowth, changeLabel: "projected", icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Churn Rate", value: `${churnRate}%`, change: -0.3, changeLabel: "vs last month", icon: TrendingDown, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "ARPU", value: formatCurrency(arpu), change: 5.2, changeLabel: "vs last month", icon: Users, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "LTV", value: formatCurrency(ltv), change: 8.1, changeLabel: "vs last quarter", icon: Target, color: "text-cyan-400", bg: "bg-cyan-400/10" },
    { label: "Net Revenue Retention", value: `${nrr}%`, change: 2.1, changeLabel: "vs last month", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  ];

  const maxMRR = Math.max(...MONTHLY_DATA.map(d => d.mrr));

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#0e1117] text-gray-200" : "bg-gray-50 text-gray-900"}`} data-testid="admin-revenue-page">
      <header className={`border-b ${isDark ? "border-[#1e2533] bg-[#161b22]" : "border-gray-200 bg-white"} px-6 py-4`}>
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Revenue Analytics</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center rounded-lg border ${isDark ? "border-[#2d3548]" : "border-gray-200"} p-0.5`}>
              {(["6m", "12m", "ytd", "all"] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    timeRange === range ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range === "6m" ? "6M" : range === "12m" ? "12M" : range === "ytd" ? "YTD" : "All"}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download size={12} /> Export
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <RefreshCw size={12} /> Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-6 gap-3">
          {topMetrics.map(metric => (
            <div key={metric.label} className={`rounded-xl border p-4 ${cardClass}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{metric.label}</span>
                <div className={`w-7 h-7 rounded-lg ${metric.bg} flex items-center justify-center`}>
                  <metric.icon size={14} className={metric.color} />
                </div>
              </div>
              <div className="text-xl font-bold mb-1">{metric.value}</div>
              <div className="flex items-center gap-1">
                <ChangeIndicator value={metric.change} />
                <span className="text-[10px] text-muted-foreground">{metric.changeLabel}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {(["overview", "cohorts", "forecast", "geo"] as const).map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section ? "bg-primary text-primary-foreground" : "text-muted-foreground " + hoverClass
              }`}
            >
              {section === "overview" ? "Revenue Breakdown" : section === "cohorts" ? "Cohort Analysis" : section === "forecast" ? "Revenue Forecast" : "Geographic"}
            </button>
          ))}
        </div>

        {activeSection === "overview" && (
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-xl border p-5 ${cardClass}`}>
              <h3 className="text-sm font-semibold mb-4">MRR Trend</h3>
              <div className="space-y-3">
                {MONTHLY_DATA.map((m, i) => {
                  const prev = i > 0 ? MONTHLY_DATA[i - 1].mrr : m.mrr;
                  const growth = ((m.mrr - prev) / prev) * 100;
                  return (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">{m.month}</span>
                      <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "#1e2533" : "#f3f4f6" }}>
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all flex items-center justify-end pr-2"
                          style={{ width: `${(m.mrr / maxMRR) * 100}%` }}>
                          <span className="text-[9px] font-medium text-white">{formatCurrency(m.mrr)}</span>
                        </div>
                      </div>
                      <ChangeIndicator value={growth} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`rounded-xl border p-5 ${cardClass}`}>
              <h3 className="text-sm font-semibold mb-4">Revenue Components</h3>
              <div className="space-y-3">
                {MONTHLY_DATA.map(m => (
                  <div key={m.month} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{m.month}</span>
                      <span className="font-medium">{formatCurrency(m.newRevenue + m.expansionRevenue)}</span>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden gap-px">
                      <div className="bg-green-500 rounded-l" style={{ width: `${(m.newRevenue / (m.newRevenue + m.expansionRevenue + m.contractionRevenue + m.churnRevenue)) * 100}%` }} title={`New: ${formatCurrency(m.newRevenue)}`} />
                      <div className="bg-blue-500" style={{ width: `${(m.expansionRevenue / (m.newRevenue + m.expansionRevenue + m.contractionRevenue + m.churnRevenue)) * 100}%` }} title={`Expansion: ${formatCurrency(m.expansionRevenue)}`} />
                      <div className="bg-yellow-500" style={{ width: `${(m.contractionRevenue / (m.newRevenue + m.expansionRevenue + m.contractionRevenue + m.churnRevenue)) * 100}%` }} title={`Contraction: ${formatCurrency(m.contractionRevenue)}`} />
                      <div className="bg-red-500 rounded-r" style={{ width: `${(m.churnRevenue / (m.newRevenue + m.expansionRevenue + m.contractionRevenue + m.churnRevenue)) * 100}%` }} title={`Churn: ${formatCurrency(m.churnRevenue)}`} />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 mt-4 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> New</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Expansion</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Contraction</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Churn</span>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border p-5 ${cardClass}`}>
              <h3 className="text-sm font-semibold mb-4">Plan Distribution</h3>
              <div className="space-y-4">
                {PLAN_DATA.map(plan => {
                  const userPct = (plan.users / totalUsers) * 100;
                  const revPct = totalRevenue > 0 ? (plan.revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={plan.plan} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded ${plan.color}`} />
                          <span className="text-sm font-medium">{plan.plan}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatNumber(plan.users)} users ({userPct.toFixed(1)}%)</span>
                          <span className="font-medium text-foreground">{formatCurrency(plan.revenue)}/mo</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[9px] text-muted-foreground mb-0.5">Users</div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "#1e2533" : "#f3f4f6" }}>
                            <div className={`h-full rounded-full ${plan.color}`} style={{ width: `${userPct}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-muted-foreground mb-0.5">Revenue</div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "#1e2533" : "#f3f4f6" }}>
                            <div className={`h-full rounded-full ${plan.color}`} style={{ width: `${revPct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`rounded-xl border p-5 ${cardClass}`}>
              <h3 className="text-sm font-semibold mb-4">Key Unit Economics</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "CAC", value: formatCurrency(cac), sub: "Customer Acquisition Cost" },
                  { label: "LTV:CAC", value: `${ltvCacRatio.toFixed(1)}x`, sub: ltvCacRatio > 3 ? "Healthy ratio" : "Needs improvement" },
                  { label: "Payback Period", value: `${Math.ceil(cac / (arpu * (1 - churnRate / 100)))} mo`, sub: "Months to recover CAC" },
                  { label: "Gross Margin", value: "82%", sub: "Revenue minus COGS" },
                  { label: "Paying Conversion", value: `${((payingUsers / totalUsers) * 100).toFixed(1)}%`, sub: `${formatNumber(payingUsers)} of ${formatNumber(totalUsers)}` },
                  { label: "Expansion Rate", value: `${((MONTHLY_DATA[5].expansionRevenue / MONTHLY_DATA[5].mrr) * 100).toFixed(1)}%`, sub: "MoM expansion revenue" },
                ].map(item => (
                  <div key={item.label} className={`rounded-lg p-3 ${isDark ? "bg-[#0e1117]" : "bg-gray-50"}`}>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</div>
                    <div className="text-lg font-bold mt-1">{item.value}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === "cohorts" && (
          <div className={`rounded-xl border p-5 ${cardClass}`}>
            <h3 className="text-sm font-semibold mb-4">Revenue Retention by Cohort</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left py-2 px-3 font-medium">Cohort</th>
                    <th className="text-center py-2 px-3 font-medium">Month 0</th>
                    <th className="text-center py-2 px-3 font-medium">Month 1</th>
                    <th className="text-center py-2 px-3 font-medium">Month 2</th>
                    <th className="text-center py-2 px-3 font-medium">Month 3</th>
                    <th className="text-center py-2 px-3 font-medium">Month 4</th>
                    <th className="text-center py-2 px-3 font-medium">Month 5</th>
                  </tr>
                </thead>
                <tbody>
                  {COHORT_DATA.map(row => (
                    <tr key={row.cohort} className={`border-t ${isDark ? "border-[#1e2533]" : "border-gray-100"}`}>
                      <td className="py-2 px-3 font-medium">{row.cohort}</td>
                      {[row.month0, row.month1, row.month2, row.month3, row.month4, row.month5].map((val, i) => {
                        if (val === 0 && i > 0) return <td key={i} className="py-2 px-3 text-center text-muted-foreground">—</td>;
                        const intensity = val / 100;
                        const bgColor = val >= 85 ? "bg-green-500" : val >= 70 ? "bg-yellow-500" : val >= 50 ? "bg-orange-500" : "bg-red-500";
                        return (
                          <td key={i} className="py-2 px-3 text-center">
                            <span className={`inline-flex items-center justify-center w-12 h-7 rounded ${bgColor} text-white font-medium`}
                              style={{ opacity: 0.3 + intensity * 0.7 }}>
                              {val}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Cohort retention shows the percentage of revenue retained from each monthly cohort over time. Values above 85% indicate strong retention.
            </div>
          </div>
        )}

        {activeSection === "forecast" && (
          <div className={`rounded-xl border p-5 ${cardClass}`}>
            <h3 className="text-sm font-semibold mb-1">Revenue Forecast (6-Month Projection)</h3>
            <p className="text-xs text-muted-foreground mb-4">Based on historical growth patterns and seasonal adjustments</p>
            <div className="space-y-3">
              {FORECAST_DATA.map(f => {
                const maxPredicted = Math.max(...FORECAST_DATA.map(d => d.high));
                const lowPct = (f.low / maxPredicted) * 100;
                const midPct = ((f.predicted - f.low) / maxPredicted) * 100;
                const highPct = ((f.high - f.predicted) / maxPredicted) * 100;
                return (
                  <div key={f.month} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{f.month}</span>
                    <div className="flex-1 flex items-center h-8 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "#1e2533" : "#f3f4f6" }}>
                      <div style={{ width: `${lowPct}%` }} />
                      <div className="h-full bg-blue-500/30 flex items-center" style={{ width: `${midPct}%` }}>
                        <div className="w-1 h-full bg-blue-500" />
                      </div>
                      <div className="h-full bg-blue-500/10" style={{ width: `${highPct}%` }} />
                    </div>
                    <div className="text-xs text-right w-40 shrink-0 flex items-center gap-2">
                      <span className="text-muted-foreground">{formatCurrency(f.low)}</span>
                      <span className="font-bold text-blue-400">{formatCurrency(f.predicted)}</span>
                      <span className="text-muted-foreground">{formatCurrency(f.high)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-6 mt-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-blue-500/30" /> Confidence range</span>
              <span className="flex items-center gap-1"><span className="w-1 h-3 bg-blue-500" /> Predicted</span>
            </div>
            <div className={`mt-6 rounded-lg p-4 ${isDark ? "bg-[#0e1117]" : "bg-gray-50"}`}>
              <div className="text-xs font-semibold mb-2">Forecast Summary</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase">Predicted Oct 2026 MRR</div>
                  <div className="font-bold text-lg">{formatCurrency(FORECAST_DATA[5].predicted)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase">Predicted Oct 2026 ARR</div>
                  <div className="font-bold text-lg">{formatCurrency(FORECAST_DATA[5].predicted * 12)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase">6-Month Growth</div>
                  <div className="font-bold text-lg text-green-400">+{(((FORECAST_DATA[5].predicted - currentMRR) / currentMRR) * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "geo" && (
          <div className={`rounded-xl border p-5 ${cardClass}`}>
            <h3 className="text-sm font-semibold mb-4">Revenue by Region</h3>
            <div className="space-y-3">
              {GEO_DATA.sort((a, b) => b.revenue - a.revenue).map(geo => {
                const maxRev = Math.max(...GEO_DATA.map(g => g.revenue));
                const pct = (geo.revenue / maxRev) * 100;
                const totalGeoRev = GEO_DATA.reduce((s, g) => s + g.revenue, 0);
                const share = (geo.revenue / totalGeoRev) * 100;
                return (
                  <div key={geo.region} className={`rounded-lg p-4 ${isDark ? "bg-[#0e1117]" : "bg-gray-50"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-muted-foreground" />
                        <span className="text-sm font-medium">{geo.region}</span>
                        <span className="text-[10px] text-muted-foreground">({share.toFixed(1)}% of total)</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">{formatNumber(geo.users)} users</span>
                        <span className="text-sm font-bold">{formatCurrency(geo.revenue)}/mo</span>
                        <ChangeIndicator value={geo.growth} />
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "#1e2533" : "#e5e7eb" }}>
                      <div className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
