import React, { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Activity, Heart, AlertTriangle, XCircle, CheckCircle,
  Clock, RefreshCw, Server, Cpu, HardDrive, Wifi, Shield, Zap,
  ChevronDown, ChevronRight, RotateCcw, Trash2, Play, Pause,
  TrendingUp, TrendingDown, Minus, Eye, Settings, Bell, Filter,
  MoreHorizontal, Download, Database, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const apiUrl = (p: string) => `${basePath}/api${p}`;

interface DependencyHealth {
  database: { healthy: boolean; latencyMs: number; message: string };
  redis: { healthy: boolean; latencyMs: number; message: string; stats: { connected: boolean; entries: number; hits: number; misses: number; hitRate: number } };
  aiProviders: { providers: { name: string; healthy: boolean; latencyMs: number; message: string }[] };
}

interface TimeSeriesPoint { timestamp: number; value: number; }

function generateTimeSeries(baseValue: number, variance: number, points: number = 60): TimeSeriesPoint[] {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => ({
    timestamp: now - (points - i) * 60000,
    value: Math.max(0, baseValue + (Math.random() - 0.5) * variance * 2),
  }));
}

function SparkLineChart({ data, color = "#3b82f6", height = 50, label, unit, current }: { data: TimeSeriesPoint[]; color?: string; height?: number; label: string; unit: string; current: number }) {
  if (data.length < 2) return null;
  const values = data.map(d => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 300;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${height - ((v - min) / range) * (height - 8) - 4}`).join(" ");
  const fillPoints = `0,${height} ${points} ${w},${height}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{current.toFixed(1)}{unit}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
        <polygon fill={`${color}15`} points={fillPoints} />
        <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
      </svg>
    </div>
  );
}

type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

interface ContainerMetrics {
  cpuPercent: number;
  memoryMB: number;
  memoryLimitMB: number;
  diskMB: number;
  diskLimitMB: number;
  networkInKBs: number;
  networkOutKBs: number;
  uptimeSeconds: number;
  restartCount: number;
}

interface HealthCheck {
  name: string;
  status: HealthStatus;
  lastChecked: Date;
  responseTimeMs: number;
  message: string;
}

interface Container {
  id: string;
  name: string;
  projectName: string;
  runtime: string;
  status: HealthStatus;
  region: string;
  metrics: ContainerMetrics;
  checks: HealthCheck[];
  events: HealthEvent[];
}

interface HealthEvent {
  id: string;
  timestamp: Date;
  type: "info" | "warning" | "error" | "recovery";
  message: string;
}

interface Alert {
  id: string;
  containerId: string;
  containerName: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

const SAMPLE_CONTAINERS: Container[] = [
  {
    id: "c1", name: "web-server-prod-1", projectName: "E-Commerce API", runtime: "Node.js 20",
    status: "healthy", region: "us-east-1",
    metrics: { cpuPercent: 23, memoryMB: 256, memoryLimitMB: 512, diskMB: 180, diskLimitMB: 1024, networkInKBs: 45, networkOutKBs: 120, uptimeSeconds: 864000, restartCount: 0 },
    checks: [
      { name: "HTTP Health", status: "healthy", lastChecked: new Date(), responseTimeMs: 12, message: "200 OK" },
      { name: "Database Connection", status: "healthy", lastChecked: new Date(), responseTimeMs: 3, message: "Connected" },
      { name: "Redis Cache", status: "healthy", lastChecked: new Date(), responseTimeMs: 1, message: "PONG" },
    ],
    events: [
      { id: "e1", timestamp: new Date(Date.now() - 3600000), type: "info", message: "Health check passed" },
      { id: "e2", timestamp: new Date(Date.now() - 7200000), type: "info", message: "Container started" },
    ],
  },
  {
    id: "c2", name: "api-worker-prod-1", projectName: "E-Commerce API", runtime: "Node.js 20",
    status: "degraded", region: "us-east-1",
    metrics: { cpuPercent: 78, memoryMB: 420, memoryLimitMB: 512, diskMB: 450, diskLimitMB: 512, networkInKBs: 200, networkOutKBs: 85, uptimeSeconds: 172800, restartCount: 2 },
    checks: [
      { name: "HTTP Health", status: "healthy", lastChecked: new Date(), responseTimeMs: 45, message: "200 OK" },
      { name: "Database Connection", status: "healthy", lastChecked: new Date(), responseTimeMs: 8, message: "Connected" },
      { name: "Memory Usage", status: "degraded", lastChecked: new Date(), responseTimeMs: 0, message: "82% memory used" },
    ],
    events: [
      { id: "e3", timestamp: new Date(Date.now() - 1800000), type: "warning", message: "Memory usage above 80% threshold" },
      { id: "e4", timestamp: new Date(Date.now() - 3600000), type: "info", message: "Auto-scaled from 256MB to 512MB" },
      { id: "e5", timestamp: new Date(Date.now() - 86400000), type: "error", message: "OOM killed, container restarted" },
      { id: "e6", timestamp: new Date(Date.now() - 86400000 + 5000), type: "recovery", message: "Container recovered after restart" },
    ],
  },
  {
    id: "c3", name: "ml-service-prod-1", projectName: "ML Pipeline", runtime: "Python 3.11",
    status: "unhealthy", region: "us-west-2",
    metrics: { cpuPercent: 95, memoryMB: 1800, memoryLimitMB: 2048, diskMB: 900, diskLimitMB: 1024, networkInKBs: 5, networkOutKBs: 2, uptimeSeconds: 300, restartCount: 5 },
    checks: [
      { name: "HTTP Health", status: "unhealthy", lastChecked: new Date(), responseTimeMs: 5000, message: "Timeout after 5000ms" },
      { name: "GPU Availability", status: "unhealthy", lastChecked: new Date(), responseTimeMs: 0, message: "No GPU available" },
      { name: "Model Loading", status: "unhealthy", lastChecked: new Date(), responseTimeMs: 0, message: "Model failed to load" },
    ],
    events: [
      { id: "e7", timestamp: new Date(Date.now() - 300000), type: "error", message: "Health check failed: timeout" },
      { id: "e8", timestamp: new Date(Date.now() - 600000), type: "error", message: "Container restarted (attempt 5/5)" },
      { id: "e9", timestamp: new Date(Date.now() - 900000), type: "warning", message: "GPU memory exhausted" },
    ],
  },
  {
    id: "c4", name: "static-assets-prod", projectName: "Marketing Site", runtime: "Nginx 1.25",
    status: "healthy", region: "eu-west-1",
    metrics: { cpuPercent: 5, memoryMB: 64, memoryLimitMB: 256, diskMB: 120, diskLimitMB: 512, networkInKBs: 300, networkOutKBs: 1500, uptimeSeconds: 2592000, restartCount: 0 },
    checks: [
      { name: "HTTP Health", status: "healthy", lastChecked: new Date(), responseTimeMs: 2, message: "200 OK" },
      { name: "SSL Certificate", status: "healthy", lastChecked: new Date(), responseTimeMs: 0, message: "Valid for 245 days" },
    ],
    events: [
      { id: "e10", timestamp: new Date(Date.now() - 86400000 * 7), type: "info", message: "SSL certificate renewed" },
    ],
  },
  {
    id: "c5", name: "db-proxy-prod-1", projectName: "E-Commerce API", runtime: "Go 1.22",
    status: "healthy", region: "us-east-1",
    metrics: { cpuPercent: 12, memoryMB: 128, memoryLimitMB: 256, diskMB: 50, diskLimitMB: 256, networkInKBs: 500, networkOutKBs: 480, uptimeSeconds: 1296000, restartCount: 0 },
    checks: [
      { name: "TCP Health", status: "healthy", lastChecked: new Date(), responseTimeMs: 1, message: "Connection pool active" },
      { name: "Connection Pool", status: "healthy", lastChecked: new Date(), responseTimeMs: 0, message: "42/100 connections used" },
    ],
    events: [
      { id: "e11", timestamp: new Date(Date.now() - 86400000), type: "info", message: "Connection pool size adjusted" },
    ],
  },
];

const SAMPLE_ALERTS: Alert[] = [
  { id: "a1", containerId: "c3", containerName: "ml-service-prod-1", severity: "critical", message: "Container unhealthy: health check timeout (5 consecutive failures)", timestamp: new Date(Date.now() - 300000), acknowledged: false },
  { id: "a2", containerId: "c2", containerName: "api-worker-prod-1", severity: "high", message: "Memory usage at 82% — approaching limit", timestamp: new Date(Date.now() - 1800000), acknowledged: false },
  { id: "a3", containerId: "c2", containerName: "api-worker-prod-1", severity: "medium", message: "Disk usage at 88% — consider cleanup", timestamp: new Date(Date.now() - 3600000), acknowledged: true },
  { id: "a4", containerId: "c3", containerName: "ml-service-prod-1", severity: "high", message: "Container restarted 5 times in last hour", timestamp: new Date(Date.now() - 600000), acknowledged: false },
];

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function StatusBadge({ status }: { status: HealthStatus }): React.ReactElement {
  const config = {
    healthy: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10", label: "Healthy" },
    degraded: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Degraded" },
    unhealthy: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Unhealthy" },
    unknown: { icon: Clock, color: "text-gray-400", bg: "bg-gray-400/10", label: "Unknown" },
  }[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color} ${config.bg}`}>
      <Icon size={10} /> {config.label}
    </span>
  );
}

function MetricBar({ value, max, label, color }: { value: number; max: number; label: string; color: string }): React.ReactElement {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = pct > 90 ? "bg-red-500" : pct > 75 ? "bg-yellow-500" : color;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span>{value}/{max} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Alert["severity"] }): React.ReactElement {
  const config = {
    low: { color: "text-blue-400", bg: "bg-blue-400/10" },
    medium: { color: "text-yellow-400", bg: "bg-yellow-400/10" },
    high: { color: "text-orange-400", bg: "bg-orange-400/10" },
    critical: { color: "text-red-400", bg: "bg-red-400/10" },
  }[severity];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${config.color} ${config.bg}`}>
      {severity}
    </span>
  );
}

export default function ContainerHealth(): React.ReactElement {
  const { theme } = useTheme();
  const [containers] = useState<Container[]>(SAMPLE_CONTAINERS);
  const [alerts, setAlerts] = useState<Alert[]>(SAMPLE_ALERTS);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set(["c3"]));
  const [filterStatus, setFilterStatus] = useState<HealthStatus | "all">("all");
  const [activeTab, setActiveTab] = useState<"overview" | "alerts" | "timeline" | "resources" | "dependencies">("overview");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [depHealth, setDepHealth] = useState<DependencyHealth | null>(null);
  const [cpuTimeSeries] = useState(() => containers.map(c => ({ id: c.id, data: generateTimeSeries(c.metrics.cpuPercent, 15) })));
  const [memTimeSeries] = useState(() => containers.map(c => ({ id: c.id, data: generateTimeSeries(c.metrics.memoryMB, 50) })));
  const [diskTimeSeries] = useState(() => containers.map(c => ({ id: c.id, data: generateTimeSeries(c.metrics.diskMB, 30) })));
  const [netTimeSeries] = useState(() => containers.map(c => ({ id: c.id, data: generateTimeSeries(c.metrics.networkOutKBs, 50) })));

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const r = await fetch(apiUrl("/health"));
        if (r.ok) {
          const d = await r.json();
          if (d.dependencies) setDepHealth(d.dependencies);
        }
      } catch {}
    };
    loadHealth();
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedContainers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  }, []);

  const filtered = containers.filter(c => filterStatus === "all" || c.status === filterStatus);
  const healthy = containers.filter(c => c.status === "healthy").length;
  const degraded = containers.filter(c => c.status === "degraded").length;
  const unhealthy = containers.filter(c => c.status === "unhealthy").length;
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;

  const detailContainer = selectedContainer ? containers.find(c => c.id === selectedContainer) : null;

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#0e1117] text-gray-200" : "bg-gray-50 text-gray-900"}`} data-testid="container-health-page">
      <header className={`border-b ${theme === "dark" ? "border-[#1e2533] bg-[#161b22]" : "border-gray-200 bg-white"} px-6 py-4`}>
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Container Health Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                autoRefresh
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : theme === "dark" ? "bg-[#1e2533] text-gray-400 border border-[#2d3548]" : "bg-gray-100 text-gray-500 border border-gray-200"
              }`}
            >
              <RefreshCw size={12} className={autoRefresh ? "animate-spin" : ""} style={autoRefresh ? { animationDuration: "3s" } : {}} />
              Auto-refresh {autoRefresh ? "ON" : "OFF"}
            </button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download size={12} /> Export
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 relative">
              <Bell size={12} />
              {unacknowledgedAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                  {unacknowledgedAlerts}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Containers", value: containers.length, icon: Server, color: "text-blue-400", bg: "bg-blue-400/10" },
            { label: "Healthy", value: healthy, icon: Heart, color: "text-green-400", bg: "bg-green-400/10" },
            { label: "Degraded", value: degraded, icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10" },
            { label: "Unhealthy", value: unhealthy, icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
          ].map(stat => (
            <div key={stat.label} className={`rounded-xl border p-4 ${
              theme === "dark" ? "bg-[#161b22] border-[#1e2533]" : "bg-white border-gray-200"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon size={16} className={stat.color} />
                </div>
              </div>
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {(["overview", "resources", "dependencies", "alerts", "timeline"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : theme === "dark" ? "text-gray-400 hover:bg-[#1e2533]" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {tab === "overview" ? "Overview" : tab === "resources" ? "Resources" : tab === "dependencies" ? "Dependencies" : tab === "alerts" ? `Alerts (${unacknowledgedAlerts})` : "Timeline"}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            {(["all", "healthy", "degraded", "unhealthy"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  filterStatus === s
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map(container => {
              const expanded = expandedContainers.has(container.id);
              return (
                <div key={container.id} className={`rounded-xl border overflow-hidden ${
                  theme === "dark" ? "bg-[#161b22] border-[#1e2533]" : "bg-white border-gray-200"
                } ${container.status === "unhealthy" ? "ring-1 ring-red-500/30" : ""}`}>
                  <div
                    className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
                      theme === "dark" ? "hover:bg-[#1c2230]" : "hover:bg-gray-50"
                    }`}
                    onClick={() => toggleExpand(container.id)}
                  >
                    {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                    <StatusBadge status={container.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{container.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === "dark" ? "bg-[#1e2533] text-gray-400" : "bg-gray-100 text-gray-500"}`}>{container.runtime}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === "dark" ? "bg-[#1e2533] text-gray-400" : "bg-gray-100 text-gray-500"}`}>{container.region}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{container.projectName}</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Cpu size={12} /> {container.metrics.cpuPercent}%</span>
                      <span className="flex items-center gap-1"><HardDrive size={12} /> {container.metrics.memoryMB}MB</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {formatUptime(container.metrics.uptimeSeconds)}</span>
                      {container.metrics.restartCount > 0 && (
                        <span className="flex items-center gap-1 text-yellow-400"><RotateCcw size={12} /> {container.metrics.restartCount}x</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="View Details" onClick={e => { e.stopPropagation(); setSelectedContainer(container.id); }}>
                        <Eye size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Restart" onClick={e => e.stopPropagation()}>
                        <RotateCcw size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="More" onClick={e => e.stopPropagation()}>
                        <MoreHorizontal size={14} />
                      </Button>
                    </div>
                  </div>

                  {expanded && (
                    <div className={`border-t px-4 py-4 space-y-4 ${theme === "dark" ? "border-[#1e2533] bg-[#0e1117]/50" : "border-gray-100 bg-gray-50/50"}`}>
                      <div className="grid grid-cols-3 gap-4">
                        <MetricBar value={container.metrics.cpuPercent} max={100} label="CPU" color="bg-blue-500" />
                        <MetricBar value={container.metrics.memoryMB} max={container.metrics.memoryLimitMB} label={`Memory (MB)`} color="bg-purple-500" />
                        <MetricBar value={container.metrics.diskMB} max={container.metrics.diskLimitMB} label={`Disk (MB)`} color="bg-cyan-500" />
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Health Checks</h4>
                        <div className="grid grid-cols-1 gap-1.5">
                          {container.checks.map(check => (
                            <div key={check.name} className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                              theme === "dark" ? "bg-[#161b22]" : "bg-white"
                            }`}>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={check.status} />
                                <span className="text-xs font-medium">{check.name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                                <span>{check.message}</span>
                                {check.responseTimeMs > 0 && <span>{check.responseTimeMs}ms</span>}
                                <span>{formatTimeAgo(check.lastChecked)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Recent Events</h4>
                        <div className="space-y-1">
                          {container.events.slice(0, 5).map(event => (
                            <div key={event.id} className="flex items-center gap-2 text-xs py-1">
                              <span className="text-[10px] text-muted-foreground w-16 shrink-0">{formatTimeAgo(event.timestamp)}</span>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                event.type === "error" ? "bg-red-400" : event.type === "warning" ? "bg-yellow-400" : event.type === "recovery" ? "bg-green-400" : "bg-blue-400"
                              }`} />
                              <span className={event.type === "error" ? "text-red-400" : event.type === "warning" ? "text-yellow-400" : ""}>{event.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Auto-remediation:</span>
                        <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
                          <RotateCcw size={10} /> Auto-restart
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-purple-500/10 text-purple-400 hover:bg-purple-500/20">
                          <Zap size={10} /> Scale up
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20">
                          <Trash2 size={10} /> Clean disk
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "alerts" && (
          <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "bg-[#161b22] border-[#1e2533]" : "bg-white border-gray-200"}`}>
            <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
              <span className="text-sm font-semibold">Active Alerts</span>
              <button className="text-[11px] text-primary hover:underline">Acknowledge All</button>
            </div>
            <div className="divide-y divide-border/20">
              {alerts.map(alert => (
                <div key={alert.id} className={`flex items-center gap-4 px-4 py-3 ${alert.acknowledged ? "opacity-50" : ""}`}>
                  <SeverityBadge severity={alert.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {alert.containerName} &middot; {formatTimeAgo(alert.timestamp)}
                    </p>
                  </div>
                  {!alert.acknowledged && (
                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => acknowledgeAlert(alert.id)}>
                      Acknowledge
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "bg-[#161b22] border-[#1e2533]" : "bg-white border-gray-200"}`}>
            <div className="px-4 py-3 border-b border-border/30">
              <span className="text-sm font-semibold">Health History Timeline</span>
            </div>
            <div className="px-4 py-4">
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-border/30" />
                {containers.flatMap(c => c.events.map(e => ({ ...e, containerName: c.name })))
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .slice(0, 20)
                  .map((event, i) => (
                    <div key={event.id + i} className="relative pl-8 pb-4">
                      <div className={`absolute left-2 top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                        theme === "dark" ? "border-[#0e1117]" : "border-gray-50"
                      } ${
                        event.type === "error" ? "bg-red-400" : event.type === "warning" ? "bg-yellow-400" : event.type === "recovery" ? "bg-green-400" : "bg-blue-400"
                      }`} />
                      <div className="text-[10px] text-muted-foreground">{formatTimeAgo(event.timestamp)} &middot; {event.containerName}</div>
                      <div className={`text-sm mt-0.5 ${event.type === "error" ? "text-red-400" : event.type === "warning" ? "text-yellow-400" : ""}`}>
                        {event.message}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "resources" && (
          <div className="space-y-4">
            {filtered.map(container => {
              const cpuData = cpuTimeSeries.find(c => c.id === container.id)?.data || [];
              const memData = memTimeSeries.find(c => c.id === container.id)?.data || [];
              const diskData = diskTimeSeries.find(c => c.id === container.id)?.data || [];
              const netData = netTimeSeries.find(c => c.id === container.id)?.data || [];
              return (
                <div key={container.id} className={`rounded-xl border p-4 ${theme === "dark" ? "bg-[#161b22] border-[#1e2533]" : "bg-white border-gray-200"}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <StatusBadge status={container.status} />
                    <span className="font-medium text-sm">{container.name}</span>
                    <span className="text-[10px] text-muted-foreground">{container.projectName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SparkLineChart data={cpuData} color="#3b82f6" label="CPU Usage" unit="%" current={container.metrics.cpuPercent} />
                    <SparkLineChart data={memData} color="#a855f7" label="Memory" unit=" MB" current={container.metrics.memoryMB} />
                    <SparkLineChart data={diskData} color="#06b6d4" label="Disk I/O" unit=" MB" current={container.metrics.diskMB} />
                    <SparkLineChart data={netData} color="#22c55e" label="Network Out" unit=" KB/s" current={container.metrics.networkOutKBs} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "dependencies" && (
          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${theme === "dark" ? "bg-[#161b22] border-[#1e2533]" : "bg-white border-gray-200"}`}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Database size={14} /> Dependency Health Checks</h3>
              {depHealth ? (
                <div className="space-y-3">
                  <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${theme === "dark" ? "bg-[#0e1117]/50" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${depHealth.database.healthy ? "bg-green-400" : "bg-red-400"}`} />
                      <Database size={14} className="text-muted-foreground" />
                      <span className="text-sm font-medium">PostgreSQL Database</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{depHealth.database.message}</span>
                      <span>{depHealth.database.latencyMs}ms</span>
                      <StatusBadge status={depHealth.database.healthy ? "healthy" : "unhealthy"} />
                    </div>
                  </div>

                  <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${theme === "dark" ? "bg-[#0e1117]/50" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${depHealth.redis.healthy ? "bg-green-400" : "bg-red-400"}`} />
                      <Zap size={14} className="text-muted-foreground" />
                      <span className="text-sm font-medium">Redis Cache</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{depHealth.redis.message}</span>
                      <span>{depHealth.redis.latencyMs}ms</span>
                      <span>Entries: {depHealth.redis.stats.entries}</span>
                      <span>Hit Rate: {(depHealth.redis.stats.hitRate * 100).toFixed(0)}%</span>
                      <StatusBadge status={depHealth.redis.healthy ? "healthy" : "unhealthy"} />
                    </div>
                  </div>

                  {depHealth.aiProviders.providers.map(provider => (
                    <div key={provider.name} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${theme === "dark" ? "bg-[#0e1117]/50" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${provider.healthy ? "bg-green-400" : "bg-red-400"}`} />
                        <Globe size={14} className="text-muted-foreground" />
                        <span className="text-sm font-medium">{provider.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{provider.message}</span>
                        <span>{provider.latencyMs}ms</span>
                        <StatusBadge status={provider.healthy ? "healthy" : "unhealthy"} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading dependency health data...</div>
              )}
            </div>
          </div>
        )}

        {detailContainer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedContainer(null)}>
            <div className={`w-[600px] max-h-[80vh] overflow-y-auto rounded-xl border shadow-2xl ${
              theme === "dark" ? "bg-[#161b22] border-[#1e2533]" : "bg-white border-gray-200"
            }`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <StatusBadge status={detailContainer.status} />
                  <span className="font-semibold">{detailContainer.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedContainer(null)}>Close</Button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Project:</span> {detailContainer.projectName}</div>
                  <div><span className="text-muted-foreground">Runtime:</span> {detailContainer.runtime}</div>
                  <div><span className="text-muted-foreground">Region:</span> {detailContainer.region}</div>
                  <div><span className="text-muted-foreground">Uptime:</span> {formatUptime(detailContainer.metrics.uptimeSeconds)}</div>
                  <div><span className="text-muted-foreground">Restarts:</span> {detailContainer.metrics.restartCount}</div>
                  <div><span className="text-muted-foreground">Network:</span> {detailContainer.metrics.networkInKBs}KB/s in, {detailContainer.metrics.networkOutKBs}KB/s out</div>
                </div>
                <div className="space-y-3">
                  <MetricBar value={detailContainer.metrics.cpuPercent} max={100} label="CPU" color="bg-blue-500" />
                  <MetricBar value={detailContainer.metrics.memoryMB} max={detailContainer.metrics.memoryLimitMB} label="Memory (MB)" color="bg-purple-500" />
                  <MetricBar value={detailContainer.metrics.diskMB} max={detailContainer.metrics.diskLimitMB} label="Disk (MB)" color="bg-cyan-500" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Health Checks</h4>
                  {detailContainer.checks.map(check => (
                    <div key={check.name} className="flex items-center justify-between py-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={check.status} />
                        <span>{check.name}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">{check.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
