import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Activity, AlertTriangle, Zap, Database, Wifi,
  Clock, RefreshCw, TrendingUp, Server, Cpu, Bot, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

interface DashboardData {
  latency: { p50: number; p95: number; p99: number; avg: number; min: number; max: number; buckets: { le: number; count: number }[] };
  errors: { total: number; errors: number; errorRate: number; byStatus: Record<string, number> };
  throughput: { rps: number; timeSeries: { timestamp: string; value: number }[] };
  latencyTimeSeries: { p50: { timestamp: string; value: number }[]; p95: { timestamp: string; value: number }[]; p99: { timestamp: string; value: number }[] };
  topEndpoints: { path: string; method: string; count: number; avgLatency: number; errorRate: number }[];
  aiGateway: { totalRequests: number; totalTokensIn: number; totalTokensOut: number; cacheHits: number; cacheMisses: number; cacheHitRate: number; errorCount: number; errorRate: number; avgLatencyMs: number; modelUsage: { model: string; requests: number }[] };
  websocket: { activeConnections: number; peakConnections: number; messagesPerSec: number; avgLatencyMs: number };
  dbPool: { activeConnections: number; idleConnections: number; maxConnections: number; waitingQueries: number; avgQueryTimeMs: number };
}

function MiniBar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2 rounded-full bg-muted/30 overflow-hidden w-full">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function SparkLine({ data, color = "#3b82f6", height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 200;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

export default function ObservabilityPage() {
  const { theme } = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState(3600_000);
  const [activeTab, setActiveTab] = useState<"overview" | "ai" | "infra">("overview");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(api(`/observability/dashboard?window=${window}`));
      if (r.ok) setData(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [window]);

  const dark = theme === "dark";
  const card = dark ? "bg-[#161b22] border-[#1e2533]" : "bg-white border-gray-200";

  return (
    <div className={`min-h-screen ${dark ? "bg-[#0e1117] text-gray-200" : "bg-gray-50 text-gray-900"}`} data-testid="observability-page">
      <header className={`border-b ${dark ? "border-[#1e2533] bg-[#161b22]" : "border-gray-200 bg-white"} px-6 py-4`}>
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Observability Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {[{ label: "1h", value: 3600_000 }, { label: "6h", value: 21600_000 }, { label: "24h", value: 86400_000 }].map(w => (
              <button key={w.value} onClick={() => setWindow(w.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium ${window === w.value ? "bg-primary text-primary-foreground" : dark ? "bg-[#1e2533] text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                {w.label}
              </button>
            ))}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={load}>
              <RefreshCw size={12} /> Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center gap-2">
          {(["overview", "ai", "infra"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-primary text-primary-foreground" : dark ? "text-gray-400 hover:bg-[#1e2533]" : "text-gray-500 hover:bg-gray-100"}`}>
              {tab === "overview" ? "Overview" : tab === "ai" ? "AI Gateway" : "Infrastructure"}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading metrics...
          </div>
        ) : data ? (
          <>
            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Throughput", value: `${data.throughput.rps} rps`, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-400/10" },
                    { label: "P95 Latency", value: `${data.latency.p95}ms`, icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10" },
                    { label: "Error Rate", value: `${data.errors.errorRate}%`, icon: AlertTriangle, color: data.errors.errorRate > 5 ? "text-red-400" : "text-green-400", bg: data.errors.errorRate > 5 ? "bg-red-400/10" : "bg-green-400/10" },
                    { label: "Active WS", value: `${data.websocket.activeConnections}`, icon: Wifi, color: "text-purple-400", bg: "bg-purple-400/10" },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl border p-4 ${card}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                        <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                          <s.icon size={16} className={s.color} />
                        </div>
                      </div>
                      <span className="text-2xl font-bold">{s.value}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`rounded-xl border p-4 ${card}`}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp size={14} /> Request Throughput</h3>
                    <SparkLine data={data.throughput.timeSeries.map(t => t.value)} color="#3b82f6" height={60} />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>{new Date(data.throughput.timeSeries[0]?.timestamp).toLocaleTimeString()}</span>
                      <span>{new Date(data.throughput.timeSeries[data.throughput.timeSeries.length - 1]?.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-4 ${card}`}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock size={14} /> Latency Distribution</h3>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div><span className="text-[10px] text-muted-foreground">P50</span><div className="text-lg font-bold text-green-400">{data.latency.p50}ms</div></div>
                      <div><span className="text-[10px] text-muted-foreground">P95</span><div className="text-lg font-bold text-yellow-400">{data.latency.p95}ms</div></div>
                      <div><span className="text-[10px] text-muted-foreground">P99</span><div className="text-lg font-bold text-red-400">{data.latency.p99}ms</div></div>
                    </div>
                    <SparkLine data={data.latencyTimeSeries.p95.map(t => t.value)} color="#eab308" height={40} />
                  </div>
                </div>

                <div className={`rounded-xl border p-4 ${card}`}>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity size={14} /> Top Endpoints</h3>
                  <div className="space-y-2">
                    {data.topEndpoints.map((ep, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg ${dark ? "bg-[#0e1117]/50" : "bg-gray-50"}`}>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${ep.method === "GET" ? "bg-green-500/10 text-green-400" : ep.method === "POST" ? "bg-blue-500/10 text-blue-400" : "bg-yellow-500/10 text-yellow-400"}`}>{ep.method}</span>
                          <span className="text-xs font-mono">{ep.path}</span>
                        </div>
                        <div className="flex items-center gap-6 text-xs text-muted-foreground">
                          <span>{ep.count.toLocaleString()} req</span>
                          <span>{ep.avgLatency}ms avg</span>
                          <span className={ep.errorRate > 5 ? "text-red-400" : ""}>{ep.errorRate}% err</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {Object.keys(data.errors.byStatus).length > 0 && (
                  <div className={`rounded-xl border p-4 ${card}`}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={14} /> Error Breakdown</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(data.errors.byStatus).map(([code, count]) => (
                        <div key={code} className={`rounded-lg p-3 ${dark ? "bg-[#0e1117]/50" : "bg-gray-50"}`}>
                          <span className="text-lg font-bold text-red-400">{count}</span>
                          <span className="text-xs text-muted-foreground ml-2">HTTP {code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "ai" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total AI Requests", value: data.aiGateway.totalRequests.toLocaleString(), icon: Bot, color: "text-purple-400" },
                    { label: "Cache Hit Rate", value: `${data.aiGateway.cacheHitRate}%`, icon: Zap, color: "text-green-400" },
                    { label: "Avg Latency", value: `${data.aiGateway.avgLatencyMs}ms`, icon: Clock, color: "text-yellow-400" },
                    { label: "Error Rate", value: `${data.aiGateway.errorRate}%`, icon: AlertTriangle, color: data.aiGateway.errorRate > 5 ? "text-red-400" : "text-green-400" },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl border p-4 ${card}`}>
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`rounded-xl border p-4 ${card}`}>
                    <h3 className="text-sm font-semibold mb-3">Token Usage</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tokens In</span>
                        <span className="font-medium">{data.aiGateway.totalTokensIn.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tokens Out</span>
                        <span className="font-medium">{data.aiGateway.totalTokensOut.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cache Hits</span>
                        <span className="font-medium text-green-400">{data.aiGateway.cacheHits.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cache Misses</span>
                        <span className="font-medium text-yellow-400">{data.aiGateway.cacheMisses.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-4 ${card}`}>
                    <h3 className="text-sm font-semibold mb-3">Model Usage</h3>
                    <div className="space-y-3">
                      {data.aiGateway.modelUsage.map(m => {
                        const maxReq = Math.max(...data.aiGateway.modelUsage.map(x => x.requests));
                        return (
                          <div key={m.model}>
                            <div className="flex justify-between text-sm mb-1">
                              <span>{m.model}</span>
                              <span className="font-medium">{m.requests.toLocaleString()}</span>
                            </div>
                            <MiniBar value={m.requests} max={maxReq} color="bg-purple-500" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "infra" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`rounded-xl border p-4 ${card}`}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Database size={14} /> DB Connection Pool</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Active / Max</span>
                          <span>{data.dbPool.activeConnections} / {data.dbPool.maxConnections}</span>
                        </div>
                        <MiniBar value={data.dbPool.activeConnections} max={data.dbPool.maxConnections} color="bg-blue-500" />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Idle</span>
                        <span>{data.dbPool.idleConnections}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Waiting Queries</span>
                        <span className={data.dbPool.waitingQueries > 5 ? "text-yellow-400" : ""}>{data.dbPool.waitingQueries}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg Query Time</span>
                        <span>{data.dbPool.avgQueryTimeMs}ms</span>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-4 ${card}`}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Wifi size={14} /> WebSocket</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Active</span>
                        <span className="font-medium text-green-400">{data.websocket.activeConnections}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Peak</span>
                        <span>{data.websocket.peakConnections}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Messages/sec</span>
                        <span>{data.websocket.messagesPerSec}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg Latency</span>
                        <span>{data.websocket.avgLatencyMs}ms</span>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-4 ${card}`}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Server size={14} /> Queue Depth</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Jobs</span>
                        <span className="font-medium">{data.latency.buckets.length > 0 ? data.latency.buckets.reduce((s, b) => s + b.count, 0) : 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl border p-4 ${card}`}>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Cpu size={14} /> Latency Histogram</h3>
                  <div className="space-y-2">
                    {data.latency.buckets.map(b => (
                      <div key={b.le} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-16 text-right">{b.le < 1000 ? `${b.le}ms` : `${b.le / 1000}s`}</span>
                        <MiniBar value={b.count} max={data.latency.buckets[data.latency.buckets.length - 1]?.count || 1} color="bg-blue-500" />
                        <span className="text-xs text-muted-foreground w-16">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">Failed to load metrics. Make sure you have admin access.</div>
        )}
      </main>
    </div>
  );
}
