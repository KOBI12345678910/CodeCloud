import React, { useState } from "react";
import {
  DollarSign, Server, HardDrive, Wifi, Database, Globe, TrendingUp,
  AlertTriangle, Lightbulb, Calendar, X, ChevronDown, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CostCategory {
  name: string;
  icon: React.ElementType;
  color: string;
  daily: number;
  monthly: number;
  trend: number;
}

interface OptimizationTip {
  id: string;
  category: string;
  savings: number;
  description: string;
  effort: "low" | "medium" | "high";
}

interface BudgetAlert {
  id: string;
  threshold: number;
  current: number;
  type: "warning" | "critical";
  message: string;
}

interface DeployCostBreakdownProps {
  onClose?: () => void;
}

const COST_DATA: CostCategory[] = [
  { name: "Compute", icon: Server, color: "bg-blue-500", daily: 2.45, monthly: 73.50, trend: 5.2 },
  { name: "Storage", icon: HardDrive, color: "bg-purple-500", daily: 0.82, monthly: 24.60, trend: 12.1 },
  { name: "Bandwidth", icon: Wifi, color: "bg-cyan-500", daily: 0.65, monthly: 19.50, trend: -3.2 },
  { name: "Database", icon: Database, color: "bg-green-500", daily: 1.20, monthly: 36.00, trend: 0 },
  { name: "CDN", icon: Globe, color: "bg-orange-500", daily: 0.35, monthly: 10.50, trend: 8.5 },
];

const TIPS: OptimizationTip[] = [
  { id: "t1", category: "Storage", savings: 8.20, description: "Remove unused container images (3 dangling, 450MB)", effort: "low" },
  { id: "t2", category: "Compute", savings: 15.00, description: "Downsize idle staging container from 2 vCPU to 0.5 vCPU", effort: "low" },
  { id: "t3", category: "Bandwidth", savings: 5.40, description: "Enable gzip compression — estimated 30% bandwidth reduction", effort: "medium" },
  { id: "t4", category: "CDN", savings: 4.20, description: "Increase cache TTL for static assets from 1h to 24h", effort: "low" },
];

const ALERTS: BudgetAlert[] = [
  { id: "a1", threshold: 200, current: 164.10, type: "warning", message: "Monthly spend at 82% of $200 budget" },
];

const DAILY_COSTS = [3.8, 4.2, 5.1, 4.8, 5.5, 5.2, 4.9, 5.8, 5.1, 4.6, 5.3, 5.0, 5.47, 5.47];

export default function DeployCostBreakdown({ onClose }: DeployCostBreakdownProps): React.ReactElement {
  const [period, setPeriod] = useState<"daily" | "monthly">("monthly");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const totalDaily = COST_DATA.reduce((s, c) => s + c.daily, 0);
  const totalMonthly = COST_DATA.reduce((s, c) => s + c.monthly, 0);
  const totalSavings = TIPS.reduce((s, t) => s + t.savings, 0);
  const maxDaily = Math.max(...DAILY_COSTS);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Cost Breakdown</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            <button onClick={() => setPeriod("daily")} className={`px-2.5 py-1 text-[10px] font-medium ${period === "daily" ? "bg-primary text-primary-foreground" : "bg-background"}`}>Daily</button>
            <button onClick={() => setPeriod("monthly")} className={`px-2.5 py-1 text-[10px] font-medium ${period === "monthly" ? "bg-primary text-primary-foreground" : "bg-background"}`}>Monthly</button>
          </div>
          {onClose && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X size={14} /></Button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 border-b border-border/30 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total {period === "daily" ? "Daily" : "Monthly"} Cost</div>
          <div className="text-3xl font-bold mt-1">${period === "daily" ? totalDaily.toFixed(2) : totalMonthly.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {period === "daily" ? `≈ $${totalMonthly.toFixed(2)}/month` : `≈ $${totalDaily.toFixed(2)}/day`}
          </div>
        </div>

        {ALERTS.map(alert => (
          <div key={alert.id} className={`mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
            alert.type === "critical" ? "border-red-500/30 bg-red-500/5 text-red-400" : "border-yellow-500/30 bg-yellow-500/5 text-yellow-400"
          }`}>
            <AlertTriangle size={14} />
            <span className="flex-1">{alert.message}</span>
          </div>
        ))}

        <div className="px-4 py-3 space-y-1">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">By Category</div>
          {COST_DATA.map(cat => {
            const value = period === "daily" ? cat.daily : cat.monthly;
            const total = period === "daily" ? totalDaily : totalMonthly;
            const pct = (value / total) * 100;
            const expanded = expandedCategory === cat.name;
            return (
              <div key={cat.name}>
                <button onClick={() => setExpandedCategory(expanded ? null : cat.name)}
                  className="w-full flex items-center gap-2 py-2 hover:bg-muted/20 rounded px-1 transition-colors">
                  {expanded ? <ChevronDown size={10} className="text-muted-foreground" /> : <ChevronRight size={10} className="text-muted-foreground" />}
                  <cat.icon size={14} className="text-muted-foreground" />
                  <span className="text-xs flex-1 text-left">{cat.name}</span>
                  <div className="w-24 h-2 rounded-full bg-muted/30 overflow-hidden">
                    <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono w-16 text-right">${value.toFixed(2)}</span>
                  <span className={`text-[10px] w-12 text-right ${cat.trend > 0 ? "text-red-400" : cat.trend < 0 ? "text-green-400" : "text-gray-400"}`}>
                    {cat.trend > 0 ? "+" : ""}{cat.trend}%
                  </span>
                </button>
                {expanded && (
                  <div className="ml-8 pl-2 py-2 text-[10px] text-muted-foreground border-l border-border/30 space-y-1">
                    <div>Daily: ${cat.daily.toFixed(2)} | Monthly: ${cat.monthly.toFixed(2)}</div>
                    <div>Share: {pct.toFixed(1)}% of total spend</div>
                    <div>Trend: {cat.trend > 0 ? "↑" : cat.trend < 0 ? "↓" : "→"} {Math.abs(cat.trend)}% vs last month</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-border/30">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Daily Cost Trend (14 days)</div>
          <div className="flex items-end gap-1 h-16">
            {DAILY_COSTS.map((cost, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full rounded-t bg-primary/60 hover:bg-primary transition-colors" style={{ height: `${(cost / maxDaily) * 100}%` }} title={`$${cost.toFixed(2)}`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
            <span>14d ago</span><span>Today</span>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <Lightbulb size={12} className="text-yellow-400" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Optimization Tips</span>
            </div>
            <span className="text-[10px] text-green-400 font-medium">Save up to ${totalSavings.toFixed(2)}/mo</span>
          </div>
          <div className="space-y-1.5">
            {TIPS.map(tip => (
              <div key={tip.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                <span className={`text-[9px] px-1 py-0.5 rounded font-semibold mt-0.5 ${tip.effort === "low" ? "bg-green-500/10 text-green-400" : tip.effort === "medium" ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"}`}>{tip.effort}</span>
                <div className="flex-1">
                  <p className="text-xs">{tip.description}</p>
                  <p className="text-[10px] text-green-400 mt-0.5">Save ${tip.savings.toFixed(2)}/mo</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
