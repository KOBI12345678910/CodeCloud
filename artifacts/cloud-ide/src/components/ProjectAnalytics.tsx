import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Eye, Users, Star, GitFork, TrendingUp, TrendingDown,
  Globe, ExternalLink, Loader2, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface AnalyticsSummary {
  totalViews: number;
  totalUniqueVisitors: number;
  totalStars: number;
  totalForks: number;
  viewsChange: number;
  visitorsChange: number;
}

interface ChartPoint {
  date: string;
  views?: number;
  unique?: number;
  stars?: number;
  forks?: number;
}

interface Referrer {
  source: string;
  visitors: number;
  percentage: number;
}

interface GeoEntry {
  country: string;
  code: string;
  visitors: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  charts: {
    views: ChartPoint[];
    stars: ChartPoint[];
    forks: ChartPoint[];
  };
  referrers: Referrer[];
  geo: GeoEntry[];
}

const PERIODS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function StatCard({ icon: Icon, label, value, change, color }: {
  icon: typeof Eye;
  label: string;
  value: number;
  change?: number;
  color: string;
}) {
  return (
    <div className="bg-[hsl(222,47%,13%)] border border-border/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className={`p-1.5 rounded-md ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold">{formatNumber(value)}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{change >= 0 ? "+" : ""}{change}% vs previous period</span>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[hsl(222,47%,15%)] border border-border/40 rounded-md px-3 py-2 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

interface ProjectAnalyticsProps {
  projectId: string;
}

export default function ProjectAnalytics({ projectId }: ProjectAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/analytics?period=${period}`, {
        credentials: "include",
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [projectId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const maxGeoVisitors = Math.max(...data.geo.map((g) => g.visitors));

  return (
    <div className="space-y-6 p-6" data-testid="project-analytics">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <div className="flex items-center gap-1 bg-[hsl(222,47%,13%)] rounded-lg p-0.5 border border-border/30">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant="ghost"
              size="sm"
              className={`h-7 text-xs px-3 ${period === p.value ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              onClick={() => setPeriod(p.value)}
              data-testid={`period-${p.value}`}
            >
              <Calendar className="w-3 h-3 mr-1" />
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Total Views" value={data.summary.totalViews} change={data.summary.viewsChange} color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={Users} label="Unique Visitors" value={data.summary.totalUniqueVisitors} change={data.summary.visitorsChange} color="bg-green-500/10 text-green-400" />
        <StatCard icon={Star} label="Stars" value={data.summary.totalStars} color="bg-yellow-500/10 text-yellow-400" />
        <StatCard icon={GitFork} label="Forks" value={data.summary.totalForks} color="bg-purple-500/10 text-purple-400" />
      </div>

      <div className="bg-[hsl(222,47%,13%)] border border-border/30 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4">Views & Visitors</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data.charts.views}>
            <defs>
              <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,47%,20%)" />
            <XAxis dataKey="date" stroke="hsl(222,10%,50%)" fontSize={10} tickFormatter={(v) => v.slice(5)} />
            <YAxis stroke="hsl(222,10%,50%)" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Area type="monotone" dataKey="views" name="Views" stroke="#3b82f6" fill="url(#viewsGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="unique" name="Unique" stroke="#22c55e" fill="url(#uniqueGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[hsl(222,47%,13%)] border border-border/30 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-4">Stars Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.charts.stars}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,47%,20%)" />
              <XAxis dataKey="date" stroke="hsl(222,10%,50%)" fontSize={10} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="hsl(222,10%,50%)" fontSize={10} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="stars" name="Stars" fill="#eab308" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[hsl(222,47%,13%)] border border-border/30 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-4">Forks Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.charts.forks}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,47%,20%)" />
              <XAxis dataKey="date" stroke="hsl(222,10%,50%)" fontSize={10} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="hsl(222,10%,50%)" fontSize={10} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="forks" name="Forks" fill="#a855f7" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[hsl(222,47%,13%)] border border-border/30 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
            Top Referrers
          </h3>
          <div className="space-y-3">
            {data.referrers.map((r) => (
              <div key={r.source} className="flex items-center gap-3">
                <span className="text-xs flex-1 truncate">{r.source}</span>
                <div className="w-32 h-1.5 bg-[hsl(222,47%,18%)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${r.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
                  {formatNumber(r.visitors)}
                </span>
                <span className="text-[10px] text-muted-foreground/50 w-10 text-right">
                  {r.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[hsl(222,47%,13%)] border border-border/30 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            Geographic Distribution
          </h3>
          <div className="space-y-2.5">
            {data.geo.map((g) => (
              <div key={g.code} className="flex items-center gap-3">
                <span className="text-xs w-5 text-center">{g.code}</span>
                <span className="text-xs flex-1 truncate">{g.country}</span>
                <div className="w-28 h-1.5 bg-[hsl(222,47%,18%)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(g.visitors / maxGeoVisitors) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
                  {formatNumber(g.visitors)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
