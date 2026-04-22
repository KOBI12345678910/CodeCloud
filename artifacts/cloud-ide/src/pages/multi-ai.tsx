import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import MultiAiHub from "@/components/ide/MultiAiHub";

const apiBase = `${import.meta.env.VITE_API_URL || ""}/api`;

interface ComparisonStat {
  modelId: string; label: string; provider: string; tier: string;
  tasks: number; success: number; successRate: number;
  avgLatencyMs: number; avgCostUsd: number; totalCostUsd: number;
  qualityScore: number; strengths: string[];
  taskTypeBreakdown: Record<string, number>;
}

function tierColor(t: string): string {
  return t === "premium" ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
    : t === "standard" ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
    : t === "economy" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
}

export default function MultiAiPage() {
  const [windowSize, setWindowSize] = useState<"7d" | "30d" | "90d">("7d");
  const compQ = useQuery<{ window: string; stats: ComparisonStat[]; recommendationCounts: Record<string, number> }>({
    queryKey: ["aiGw", "comparison", windowSize],
    queryFn: () => fetch(`${apiBase}/ai/gateway/comparison?window=${windowSize}`, { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const stats = compQ.data?.stats ?? [];
  const ranked = useMemo(() => stats.slice().sort((a, b) => b.qualityScore - a.qualityScore), [stats]);
  const cheapest = useMemo(() => stats.slice().filter(s => s.tasks > 0).sort((a, b) => a.avgCostUsd - b.avgCostUsd)[0], [stats]);
  const fastest = useMemo(() => stats.slice().filter(s => s.tasks > 0).sort((a, b) => a.avgLatencyMs - b.avgLatencyMs)[0], [stats]);
  const best = ranked[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm" data-testid="link-back"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
        <Sparkles className="h-5 w-5 text-purple-400" />
        <div>
          <h1 className="text-lg font-semibold">Multi-AI Hub</h1>
          <p className="text-xs text-muted-foreground">Compare 10 providers, run councils, and watch costs in real time.</p>
        </div>
        <div className="ml-auto">
          <Tabs value={windowSize} onValueChange={(v) => setWindowSize(v as "7d" | "30d" | "90d")}>
            <TabsList>
              <TabsTrigger value="7d" data-testid="tab-window-7d">7d</TabsTrigger>
              <TabsTrigger value="30d" data-testid="tab-window-30d">30d</TabsTrigger>
              <TabsTrigger value="90d" data-testid="tab-window-90d">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_440px] gap-0 h-[calc(100vh-65px)]">
        <div className="overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4" data-testid="card-best-quality">
              <div className="text-xs uppercase text-muted-foreground">Best quality</div>
              <div className="text-lg font-semibold">{best?.label ?? "—"}</div>
              <div className="text-xs text-muted-foreground">score {best?.qualityScore ?? "—"}</div>
            </Card>
            <Card className="p-4" data-testid="card-cheapest">
              <div className="text-xs uppercase text-muted-foreground">Cheapest active</div>
              <div className="text-lg font-semibold">{cheapest?.label ?? "—"}</div>
              <div className="text-xs text-muted-foreground">${cheapest ? cheapest.avgCostUsd.toFixed(5) : "—"} / task</div>
            </Card>
            <Card className="p-4" data-testid="card-fastest">
              <div className="text-xs uppercase text-muted-foreground">Fastest active</div>
              <div className="text-lg font-semibold">{fastest?.label ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{fastest?.avgLatencyMs ?? "—"} ms avg</div>
            </Card>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-sm">Model comparison</h2>
              <p className="text-xs text-muted-foreground">Live from your real usage. Quality blends judge rubric scores with baseline.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Model</th>
                    <th className="text-left px-2 py-2">Tier</th>
                    <th className="text-right px-2 py-2">Tasks</th>
                    <th className="text-right px-2 py-2">Success</th>
                    <th className="text-right px-2 py-2">Avg cost</th>
                    <th className="text-right px-2 py-2">Avg latency</th>
                    <th className="text-right px-2 py-2">Quality</th>
                    <th className="text-left px-4 py-2">Best at</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map(s => (
                    <tr key={s.modelId} className="border-t border-border/50" data-testid={`row-${s.modelId}`}>
                      <td className="px-4 py-2 font-medium">{s.label}<div className="text-[10px] text-muted-foreground">{s.provider}</div></td>
                      <td className="px-2 py-2"><Badge variant="outline" className={`text-[10px] ${tierColor(s.tier)}`}>{s.tier}</Badge></td>
                      <td className="px-2 py-2 text-right font-mono">{s.tasks}</td>
                      <td className="px-2 py-2 text-right font-mono">{s.tasks ? `${Math.round(s.successRate * 100)}%` : "—"}</td>
                      <td className="px-2 py-2 text-right font-mono">${s.avgCostUsd.toFixed(5)}</td>
                      <td className="px-2 py-2 text-right font-mono">{s.avgLatencyMs} ms</td>
                      <td className="px-2 py-2 text-right font-mono">{s.qualityScore}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{s.strengths.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {compQ.data && Object.keys(compQ.data.recommendationCounts).length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Community picks</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(compQ.data.recommendationCounts).sort((a, b) => b[1] - a[1]).map(([id, n]) => (
                  <Badge key={id} variant="outline">{stats.find(s => s.modelId === id)?.label ?? id} · {n}</Badge>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="border-l">
          <MultiAiHub />
        </div>
      </div>
    </div>
  );
}
