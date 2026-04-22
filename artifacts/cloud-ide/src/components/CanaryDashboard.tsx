import { useState } from "react";
import { X, GitBranch, CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

interface Props { onClose: () => void; }

interface MetricComparison {
  name: string;
  unit: string;
  baseline: number;
  canary: number;
  threshold: number;
  trend: { baseline: number[]; canary: number[] };
}

const METRICS: MetricComparison[] = [
  { name: "Error Rate", unit: "%", baseline: 0.12, canary: 0.15, threshold: 0.5, trend: { baseline: [0.1, 0.11, 0.13, 0.12, 0.11, 0.12, 0.12], canary: [0.2, 0.18, 0.16, 0.15, 0.14, 0.15, 0.15] } },
  { name: "p50 Latency", unit: "ms", baseline: 45, canary: 48, threshold: 100, trend: { baseline: [42, 44, 46, 45, 43, 44, 45], canary: [52, 50, 49, 48, 47, 48, 48] } },
  { name: "p95 Latency", unit: "ms", baseline: 120, canary: 135, threshold: 250, trend: { baseline: [115, 118, 122, 120, 119, 121, 120], canary: [145, 140, 138, 136, 134, 135, 135] } },
  { name: "p99 Latency", unit: "ms", baseline: 280, canary: 310, threshold: 500, trend: { baseline: [270, 275, 282, 280, 278, 279, 280], canary: [340, 330, 320, 315, 312, 310, 310] } },
  { name: "Throughput", unit: "rps", baseline: 1250, canary: 1180, threshold: 900, trend: { baseline: [1200, 1220, 1240, 1250, 1260, 1255, 1250], canary: [1100, 1120, 1150, 1160, 1170, 1175, 1180] } },
  { name: "CPU Usage", unit: "%", baseline: 34, canary: 38, threshold: 80, trend: { baseline: [30, 32, 33, 34, 35, 34, 34], canary: [40, 39, 38, 37, 38, 38, 38] } },
  { name: "Memory Usage", unit: "MB", baseline: 256, canary: 274, threshold: 512, trend: { baseline: [248, 250, 254, 256, 258, 257, 256], canary: [280, 278, 276, 275, 274, 274, 274] } },
  { name: "5xx Count", unit: "", baseline: 3, canary: 5, threshold: 20, trend: { baseline: [2, 3, 4, 3, 2, 3, 3], canary: [8, 7, 6, 5, 5, 5, 5] } },
];

const CONFIDENCE = 87;
const CANARY_WEIGHT = 10;
const DURATION = "2h 15m";
const STATUS: "running" | "passed" | "failed" = "running";

function Sparkline({ baseline, canary }: { baseline: number[]; canary: number[] }) {
  const all = [...baseline, ...canary];
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const range = max - min || 1;
  const toY = (v: number) => 26 - ((v - min) / range) * 22;
  const bPts = baseline.map((v, i) => `${(i / (baseline.length - 1)) * 58},${toY(v)}`).join(" ");
  const cPts = canary.map((v, i) => `${(i / (canary.length - 1)) * 58},${toY(v)}`).join(" ");
  return (
    <svg viewBox="0 0 58 28" className="w-20 h-6">
      <polyline points={bPts} fill="none" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <polyline points={cPts} fill="none" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DiffBadge({ baseline, canary, lowerIsBetter = true }: { baseline: number; canary: number; lowerIsBetter?: boolean }) {
  if (baseline === 0) return null;
  const pct = ((canary - baseline) / baseline) * 100;
  const isWorse = lowerIsBetter ? pct > 0 : pct < 0;
  const Icon = Math.abs(pct) < 2 ? Minus : pct > 0 ? TrendingUp : TrendingDown;
  const color = Math.abs(pct) < 2 ? "text-muted-foreground" : isWorse ? "text-yellow-400" : "text-green-400";
  return <span className={`inline-flex items-center gap-0.5 text-[8px] ${color}`}><Icon className="w-2.5 h-2.5" />{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</span>;
}

export function CanaryDashboard({ onClose }: Props) {
  const [view, setView] = useState<"grid" | "table">("grid");

  const lowerBetter = (name: string) => !name.includes("Throughput");

  return (
    <div className="h-full flex flex-col bg-background" data-testid="canary-dashboard">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Canary Metrics</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${STATUS === "running" ? "bg-blue-400/10 text-blue-400" : STATUS === "passed" ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>{STATUS}</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="px-3 pt-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-[9px]">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400" /><span className="text-muted-foreground">Baseline (90%)</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-muted-foreground">Canary ({CANARY_WEIGHT}%)</span></div>
          <span className="text-muted-foreground">Duration: {DURATION}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[9px]">
            <span className="text-muted-foreground">Confidence:</span>
            <span className={`font-bold ${CONFIDENCE >= 80 ? "text-green-400" : CONFIDENCE >= 50 ? "text-yellow-400" : "text-red-400"}`}>{CONFIDENCE}%</span>
          </div>
          <div className="flex gap-0.5">
            <button onClick={() => setView("grid")} className={`px-1.5 py-0.5 text-[9px] rounded ${view === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>Grid</button>
            <button onClick={() => setView("table")} className={`px-1.5 py-0.5 text-[9px] rounded ${view === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>Table</button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {view === "grid" ? (
          <div className="grid grid-cols-4 gap-2">
            {METRICS.map(m => {
              const withinBudget = lowerBetter(m.name) ? m.canary <= m.threshold : m.canary >= m.threshold;
              const Icon = withinBudget ? CheckCircle2 : AlertTriangle;
              return (
                <div key={m.name} className={`bg-card/50 rounded-lg border p-2.5 ${!withinBudget ? "border-yellow-400/30" : "border-border/30"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-medium">{m.name}</span>
                    <Icon className={`w-3 h-3 ${withinBudget ? "text-green-400" : "text-yellow-400"}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[9px] mb-1.5">
                    <div>
                      <div className="text-[7px] text-muted-foreground">Baseline</div>
                      <div className="font-medium text-green-400">{m.baseline}{m.unit}</div>
                    </div>
                    <div>
                      <div className="text-[7px] text-muted-foreground">Canary</div>
                      <div className="font-medium text-blue-400">{m.canary}{m.unit}</div>
                    </div>
                  </div>
                  <Sparkline baseline={m.trend.baseline} canary={m.trend.canary} />
                  <div className="flex items-center justify-between mt-1">
                    <DiffBadge baseline={m.baseline} canary={m.canary} lowerIsBetter={lowerBetter(m.name)} />
                    <span className="text-[7px] text-muted-foreground">threshold: {m.threshold}{m.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card/50 rounded-lg border border-border/30 overflow-hidden">
            <table className="w-full text-[9px]">
              <thead><tr className="border-b border-border/30">
                <th className="text-left p-2 font-normal text-muted-foreground">Metric</th>
                <th className="text-right p-2 font-normal text-muted-foreground">Baseline</th>
                <th className="text-right p-2 font-normal text-muted-foreground">Canary</th>
                <th className="text-right p-2 font-normal text-muted-foreground">Diff</th>
                <th className="text-right p-2 font-normal text-muted-foreground">Threshold</th>
                <th className="text-center p-2 font-normal text-muted-foreground">Trend</th>
                <th className="text-center p-2 font-normal text-muted-foreground">Status</th>
              </tr></thead>
              <tbody>
                {METRICS.map(m => {
                  const withinBudget = lowerBetter(m.name) ? m.canary <= m.threshold : m.canary >= m.threshold;
                  return (
                    <tr key={m.name} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="p-2 font-medium">{m.name}</td>
                      <td className="p-2 text-right text-green-400">{m.baseline}{m.unit}</td>
                      <td className="p-2 text-right text-blue-400">{m.canary}{m.unit}</td>
                      <td className="p-2 text-right"><DiffBadge baseline={m.baseline} canary={m.canary} lowerIsBetter={lowerBetter(m.name)} /></td>
                      <td className="p-2 text-right text-muted-foreground">{m.threshold}{m.unit}</td>
                      <td className="p-2 text-center"><Sparkline baseline={m.trend.baseline} canary={m.trend.canary} /></td>
                      <td className="p-2 text-center">{withinBudget ? <CheckCircle2 className="w-3 h-3 text-green-400 inline" /> : <AlertTriangle className="w-3 h-3 text-yellow-400 inline" />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
