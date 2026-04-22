import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import {
  AlertTriangle,
  ArrowLeft,
  Bug,
  CheckCircle2,
  Clock,
  EyeOff,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  XCircle,
  Globe,
  Monitor,
} from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface ErrorGroup {
  fingerprint: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  status: string;
  affectedUsers: number;
  trend: number[];
  errors: any[];
}

interface ErrorStats {
  totalErrors: number;
  unresolvedCount: number;
  resolvedCount: number;
  ignoredCount: number;
  errorRate: number;
  topErrors: ErrorGroup[];
  hourlyBreakdown: { hour: string; count: number }[];
  browserBreakdown: { browser: string; count: number; percentage: number }[];
  affectedDeployments: { deploymentId: string; errorCount: number }[];
}

export default function ErrorDashboard() {
  const { user } = useUser();
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorGroup | null>(null);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved" | "ignored">("all");
  const [projectId] = useState("default");

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/projects/${projectId}/errors`, { credentials: "include" });
      if (res.ok) setStats(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const resolveError = async (fingerprint: string) => {
    try {
      const res = await fetch(`${API}/projects/${projectId}/errors/${fingerprint}/resolve`, { method: "POST", credentials: "include" });
      if (res.ok) fetchStats();
    } catch {}
  };

  const ignoreError = async (fingerprint: string) => {
    try {
      const res = await fetch(`${API}/projects/${projectId}/errors/${fingerprint}/ignore`, { method: "POST", credentials: "include" });
      if (res.ok) fetchStats();
    } catch {}
  };

  const filteredErrors = stats?.topErrors.filter(e => filter === "all" || e.status === filter) || [];
  const maxTrend = Math.max(...(stats?.hourlyBreakdown.map(h => h.count) || [1]));

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "unresolved": return "text-red-400 bg-red-400/10";
      case "resolved": return "text-green-400 bg-green-400/10";
      case "ignored": return "text-gray-400 bg-gray-400/10";
      case "regressed": return "text-orange-400 bg-orange-400/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="error-dashboard">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs"><ArrowLeft className="w-3.5 h-3.5" /> Back</Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2"><Bug className="w-4 h-4 text-red-400" /><h1 className="text-sm font-semibold">Error Tracking</h1></div>
          </div>
          <button onClick={fetchStats} className="flex items-center gap-1.5 px-3 py-1 text-xs border border-border rounded-md hover:bg-muted"><RefreshCw className="w-3 h-3" /> Refresh</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-card/50 rounded-lg p-4 border border-border/30">
                <div className="text-2xl font-bold">{stats.totalErrors.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Errors</div>
              </div>
              <div className="bg-red-400/5 rounded-lg p-4 border border-red-400/20">
                <div className="text-2xl font-bold text-red-400">{stats.unresolvedCount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Unresolved</div>
              </div>
              <div className="bg-green-400/5 rounded-lg p-4 border border-green-400/20">
                <div className="text-2xl font-bold text-green-400">{stats.resolvedCount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Resolved</div>
              </div>
              <div className="bg-card/50 rounded-lg p-4 border border-border/30">
                <div className="text-2xl font-bold">{stats.ignoredCount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Ignored</div>
              </div>
              <div className="bg-card/50 rounded-lg p-4 border border-border/30">
                <div className="text-2xl font-bold">{stats.errorRate}%</div>
                <div className="text-xs text-muted-foreground mt-1">Error Rate</div>
              </div>
            </div>

            <div className="bg-card/50 rounded-lg border border-border/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Error Frequency (24h)</h2>
              </div>
              <div className="flex items-end gap-[2px] h-24">
                {stats.hourlyBreakdown.map((h, i) => (
                  <div key={i} className="flex-1 group relative">
                    <div className="bg-red-400/60 hover:bg-red-400 rounded-t transition-colors" style={{ height: `${(h.count / maxTrend) * 100}%`, minHeight: "2px" }} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap border border-border z-10">
                      {new Date(h.hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}: {h.count} errors
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>24h ago</span><span>Now</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium">Error Groups</h2>
                  <div className="flex gap-1">
                    {(["all", "unresolved", "resolved", "ignored"] as const).map(f => (
                      <button key={f} onClick={() => setFilter(f)} className={`px-2 py-0.5 text-[10px] rounded-full capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{f}</button>
                    ))}
                  </div>
                </div>
                {filteredErrors.length === 0 && <div className="text-xs text-muted-foreground text-center py-8">No errors matching filter</div>}
                {filteredErrors.map(group => (
                  <div key={group.fingerprint} onClick={() => setSelectedError(selectedError?.fingerprint === group.fingerprint ? null : group)} className="bg-card/50 rounded-lg border border-border/30 p-3 cursor-pointer hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${group.status === "unresolved" ? "text-red-400" : group.status === "resolved" ? "text-green-400" : "text-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono truncate">{group.message}</div>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          <span className={`px-1.5 py-0.5 rounded capitalize ${statusColor(group.status)}`}>{group.status}</span>
                          <span className="flex items-center gap-1"><XCircle className="w-2.5 h-2.5" /> {group.count.toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" /> {group.affectedUsers.toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {timeAgo(group.lastSeen)}</span>
                        </div>
                        <div className="flex items-end gap-px mt-2 h-6">
                          {group.trend.map((v, i) => (
                            <div key={i} className="flex-1 bg-red-400/30 rounded-t" style={{ height: `${(v / Math.max(...group.trend, 1)) * 100}%`, minHeight: "1px" }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    {selectedError?.fingerprint === group.fingerprint && (
                      <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                        <div className="bg-muted/50 rounded p-2 font-mono text-[10px] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {group.errors[0]?.stack || "No stack trace available"}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>First seen: {new Date(group.firstSeen).toLocaleString()}</span>
                          <span>|</span>
                          <span>Last seen: {new Date(group.lastSeen).toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); resolveError(group.fingerprint); }} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-green-400/10 text-green-400 border border-green-400/20 rounded hover:bg-green-400/20">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Resolve
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); ignoreError(group.fingerprint); }} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-gray-400/10 text-gray-400 border border-gray-400/20 rounded hover:bg-gray-400/20">
                            <EyeOff className="w-2.5 h-2.5" /> Ignore
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="bg-card/50 rounded-lg border border-border/30 p-4">
                  <h3 className="text-xs font-medium flex items-center gap-2 mb-3"><Monitor className="w-3.5 h-3.5 text-primary" /> Browser Breakdown</h3>
                  <div className="space-y-2">
                    {stats.browserBreakdown.map(b => (
                      <div key={b.browser}>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span>{b.browser}</span><span className="text-muted-foreground">{b.percentage}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${b.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card/50 rounded-lg border border-border/30 p-4">
                  <h3 className="text-xs font-medium flex items-center gap-2 mb-3"><Globe className="w-3.5 h-3.5 text-primary" /> Affected Deployments</h3>
                  <div className="space-y-1.5">
                    {stats.affectedDeployments.slice(0, 5).map(d => (
                      <div key={d.deploymentId} className="flex justify-between items-center text-[10px]">
                        <span className="font-mono text-muted-foreground">{d.deploymentId}</span>
                        <span className="text-red-400">{d.errorCount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
