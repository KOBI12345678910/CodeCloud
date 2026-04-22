import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Rocket,
  Globe,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Plus,
  Trash2,
  RotateCcw,
  Activity,
  Cpu,
  HardDrive,
  Timer,
  Terminal,
  Eye,
  EyeOff,
  MapPin,
  Server,
  Zap,
  Calendar,
} from "lucide-react";

type DeployStatus = "live" | "building" | "failed" | "stopped";

interface Deployment {
  id: string;
  name: string;
  type: string;
  status: DeployStatus;
  domain: string;
  region: string;
  timestamp: string;
  version: string;
}

interface EnvVar {
  key: string;
  value: string;
  hidden: boolean;
}

interface RollbackEntry {
  id: string;
  version: string;
  timestamp: string;
  author: string;
  message: string;
}

const statusStyles: Record<DeployStatus, { color: string; icon: typeof CheckCircle2 }> = {
  live: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
  building: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Loader2 },
  failed: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
  stopped: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: Clock },
};

const demoDeployments: Deployment[] = [
  { id: "d1", name: "production-api", type: "Autoscale", status: "live", domain: "api.myapp.com", region: "us-east-1", timestamp: "5 min ago", version: "v2.4.1" },
  { id: "d2", name: "marketing-site", type: "Static", status: "live", domain: "myapp.com", region: "global-cdn", timestamp: "1 hour ago", version: "v1.12.0" },
  { id: "d3", name: "cron-workers", type: "Scheduled", status: "building", domain: "—", region: "us-west-2", timestamp: "2 min ago", version: "v3.0.0-rc1" },
  { id: "d4", name: "gpu-inference", type: "Reserved VM", status: "stopped", domain: "ml.myapp.com", region: "eu-west-1", timestamp: "2 days ago", version: "v1.0.3" },
];

const demoDomains = [
  { domain: "myapp.com", ssl: true, dns: "verified", primary: true },
  { domain: "api.myapp.com", ssl: true, dns: "verified", primary: false },
  { domain: "staging.myapp.com", ssl: true, dns: "pending", primary: false },
  { domain: "ml.myapp.com", ssl: false, dns: "failed", primary: false },
];

const demoEnvVars: EnvVar[] = [
  { key: "DATABASE_URL", value: "postgresql://user:***@db.myapp.com:5432/prod", hidden: true },
  { key: "REDIS_URL", value: "redis://cache.myapp.com:6379", hidden: true },
  { key: "API_SECRET", value: "sk_live_***************************", hidden: true },
  { key: "NODE_ENV", value: "production", hidden: false },
  { key: "LOG_LEVEL", value: "info", hidden: false },
];

const demoBuildLogs = [
  "[00:00] Cloning repository...",
  "[00:01] Installing dependencies...",
  "[00:03] pnpm install --frozen-lockfile",
  "[00:08] ✓ 1,247 packages installed",
  "[00:09] Running build...",
  "[00:10] tsc --noEmit && vite build",
  "[00:14] ✓ Build completed in 4.2s",
  "[00:15] Optimizing assets...",
  "[00:16] ✓ 23 assets compressed (2.1 MB → 680 KB)",
  "[00:17] Running health check...",
  "[00:18] ✓ HTTP 200 OK",
  "[00:19] ✓ Deployment live at api.myapp.com",
];

const demoRollbacks: RollbackEntry[] = [
  { id: "r1", version: "v2.4.1", timestamp: "5 min ago", author: "Sarah Chen", message: "Fix auth token refresh" },
  { id: "r2", version: "v2.4.0", timestamp: "3 hours ago", author: "AI Agent", message: "Add rate limiting middleware" },
  { id: "r3", version: "v2.3.9", timestamp: "Yesterday", author: "James Liu", message: "Update database schema" },
  { id: "r4", version: "v2.3.8", timestamp: "2 days ago", author: "Sarah Chen", message: "Perf: cache query results" },
];

const regions = [
  { id: "us-east", name: "US East", city: "Virginia", active: true, x: 27, y: 38 },
  { id: "us-west", name: "US West", city: "Oregon", active: true, x: 14, y: 35 },
  { id: "eu-west", name: "EU West", city: "Ireland", active: true, x: 45, y: 28 },
  { id: "eu-central", name: "EU Central", city: "Frankfurt", active: false, x: 50, y: 30 },
  { id: "ap-southeast", name: "Asia Pacific", city: "Singapore", active: true, x: 78, y: 55 },
  { id: "ap-northeast", name: "Asia NE", city: "Tokyo", active: false, x: 85, y: 33 },
];

const deployTypes = [
  { id: "autoscale", label: "Autoscale", icon: Zap, description: "Auto-scaling containers" },
  { id: "static", label: "Static", icon: Globe, description: "Global CDN hosting" },
  { id: "scheduled", label: "Scheduled", icon: Calendar, description: "Cron & scheduled jobs" },
  { id: "reserved", label: "Reserved VM", icon: Server, description: "Dedicated machines" },
];

const generateChartData = (points: number, base: number, variance: number) =>
  Array.from({ length: points }, (_, i) => ({
    time: `${i}m`,
    value: Math.max(0, base + Math.round((Math.sin(i * 0.5) + Math.random() - 0.5) * variance)),
  }));

const requestsData = generateChartData(24, 12800, 2000);
const cpuData = generateChartData(24, 34, 12);
const memoryData = generateChartData(24, 1200, 200);
const uptimeData = Array.from({ length: 30 }, (_, i) => ({
  time: `${30 - i}d`,
  value: 99.5 + Math.random() * 0.5,
}));

export default function DeployPage() {
  const [envVars, setEnvVars] = useState(demoEnvVars);
  const [activeDeployType, setActiveDeployType] = useState("autoscale");
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(
    new Set(regions.filter((r) => r.active).map((r) => r.id))
  );

  const toggleEnvVisibility = (index: number) => {
    setEnvVars((prev) => prev.map((v, i) => (i === index ? { ...v, hidden: !v.hidden } : v)));
  };

  const addEnvVar = () => {
    setEnvVars((prev) => [...prev, { key: "", value: "", hidden: false }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleRegion = (id: string) => {
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <FeaturePageLayout title="Deployment Hub" subtitle="Deploy, manage, and monitor your applications across global infrastructure" badge="Infrastructure" testId="deploy-page">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {deployTypes.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveDeployType(t.id)} className={`p-4 rounded-lg border text-left transition-all ${activeDeployType === t.id ? "border-primary bg-primary/10" : "border-border/50 bg-card/50 hover:border-primary/30"}`}>
                <Icon className={`w-5 h-5 mb-2 ${activeDeployType === t.id ? "text-primary" : "text-muted-foreground"}`} />
                <div className="font-medium text-sm">{t.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{t.description}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Requests/min", data: requestsData, color: "#3b82f6", value: "12,847", trend: "+8.3%" },
            { label: "CPU Usage", data: cpuData, color: "#22c55e", value: "34%", trend: "−2.1%" },
            { label: "Memory (MB)", data: memoryData, color: "#a855f7", value: "1.2 GB", trend: "+0.5%" },
            { label: "Uptime (%)", data: uptimeData, color: "#10b981", value: "99.98%", trend: "30d" },
          ].map((metric) => (
            <Card key={metric.label} className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="pt-3 pb-2 px-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                  <span className="text-[10px] text-muted-foreground">{metric.trend}</span>
                </div>
                <div className="text-lg font-bold" style={{ color: metric.color }}>{metric.value}</div>
                <div className="h-16 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metric.data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`grad-${metric.label}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={metric.color} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={metric.color} strokeWidth={1.5} fill={`url(#grad-${metric.label})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="deployments" className="space-y-4">
          <TabsList className="bg-card/50 border border-border/50">
            <TabsTrigger value="deployments" className="gap-1.5 text-xs"><Rocket className="w-3.5 h-3.5" /> Deployments</TabsTrigger>
            <TabsTrigger value="domains" className="gap-1.5 text-xs"><Globe className="w-3.5 h-3.5" /> Domains</TabsTrigger>
            <TabsTrigger value="env" className="gap-1.5 text-xs"><Lock className="w-3.5 h-3.5" /> Env Vars</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs"><Terminal className="w-3.5 h-3.5" /> Build Logs</TabsTrigger>
            <TabsTrigger value="rollbacks" className="gap-1.5 text-xs"><RotateCcw className="w-3.5 h-3.5" /> Rollbacks</TabsTrigger>
            <TabsTrigger value="regions" className="gap-1.5 text-xs"><MapPin className="w-3.5 h-3.5" /> Regions</TabsTrigger>
          </TabsList>

          <TabsContent value="deployments">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/30 text-xs text-muted-foreground">
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Domain</th>
                        <th className="text-left p-3 font-medium">Region</th>
                        <th className="text-left p-3 font-medium">Version</th>
                        <th className="text-left p-3 font-medium">Deployed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demoDeployments.map((d) => {
                        const StatusIcon = statusStyles[d.status].icon;
                        return (
                          <tr key={d.id} className="border-b border-border/20 hover:bg-accent/30 transition-colors">
                            <td className="p-3 text-sm font-medium">{d.name}</td>
                            <td className="p-3"><Badge variant="outline" className="text-[10px]">{d.type}</Badge></td>
                            <td className="p-3">
                              <Badge variant="outline" className={`text-[10px] border ${statusStyles[d.status].color}`}>
                                <StatusIcon className={`w-3 h-3 mr-1 ${d.status === "building" ? "animate-spin" : ""}`} />
                                {d.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground font-mono text-xs">{d.domain}</td>
                            <td className="p-3 text-sm text-muted-foreground text-xs">{d.region}</td>
                            <td className="p-3"><Badge variant="outline" className="text-[10px] font-mono">{d.version}</Badge></td>
                            <td className="p-3 text-xs text-muted-foreground">{d.timestamp}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domains">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Domain Management</CardTitle>
                  <Button size="sm" className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Add Domain</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {demoDomains.map((d) => (
                  <div key={d.domain} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-background/30 border border-border/20">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{d.domain}</span>
                      {d.primary && <Badge className="text-[9px] h-4 bg-primary/20 text-primary border-primary/30">Primary</Badge>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Lock className={`w-3 h-3 ${d.ssl ? "text-green-400" : "text-red-400"}`} />
                        <span className="text-[10px] text-muted-foreground">{d.ssl ? "SSL Active" : "No SSL"}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${d.dns === "verified" ? "text-green-400 border-green-500/30" : d.dns === "pending" ? "text-yellow-400 border-yellow-500/30" : "text-red-400 border-red-500/30"}`}>
                        DNS: {d.dns}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="env">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Environment Variables</CardTitle>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={addEnvVar}><Plus className="w-3 h-3" /> Add Variable</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {envVars.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={v.key} onChange={(e) => setEnvVars((prev) => prev.map((ev, idx) => (idx === i ? { ...ev, key: e.target.value } : ev)))} placeholder="KEY" className="h-8 text-xs font-mono bg-background/50 w-40" />
                    <span className="text-muted-foreground">=</span>
                    <Input value={v.hidden ? "••••••••••••" : v.value} onChange={(e) => setEnvVars((prev) => prev.map((ev, idx) => (idx === i ? { ...ev, value: e.target.value } : ev)))} placeholder="value" className="h-8 text-xs font-mono bg-background/50 flex-1" readOnly={v.hidden} />
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleEnvVisibility(i)}>
                      {v.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300" onClick={() => removeEnvVar(i)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Terminal className="w-4 h-4" /> Build Logs</CardTitle>
                  <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/30">Build Succeeded</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-black/60 rounded-lg p-4 font-mono text-xs space-y-0.5 max-h-64 overflow-y-auto border border-border/20">
                  {demoBuildLogs.map((line, i) => (
                    <div key={i} className={`${line.includes("✓") ? "text-green-400" : line.includes("✗") ? "text-red-400" : "text-gray-400"}`}>
                      {line}
                    </div>
                  ))}
                  <div className="text-green-400 animate-pulse mt-2">▊</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rollbacks">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Rollback History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {demoRollbacks.map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-background/30 border border-border/20">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-[10px]">{r.version}</Badge>
                      <div>
                        <p className="text-sm">{r.message}</p>
                        <p className="text-[10px] text-muted-foreground">{r.author} · {r.timestamp}</p>
                      </div>
                    </div>
                    {i > 0 && (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <RotateCcw className="w-3 h-3" /> Rollback
                      </Button>
                    )}
                    {i === 0 && <Badge className="text-[9px] bg-green-500/20 text-green-400 border-green-500/30">Current</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> Global Region Selector</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full rounded-lg overflow-hidden border border-border/30 bg-slate-900/80" style={{ aspectRatio: "2/1" }}>
                  <svg viewBox="0 0 100 50" className="w-full h-full" style={{ opacity: 0.15 }}>
                    <path d="M5,25 Q10,10 25,15 T40,20 Q45,5 55,18 T70,15 Q80,10 90,20 T95,25" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
                    <path d="M10,30 Q15,35 30,32 T50,35 Q60,40 75,35 T90,30" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
                    <path d="M15,20 Q20,22 35,18 T55,22 Q65,25 80,20 T92,22" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-muted-foreground" />
                    <ellipse cx="25" cy="30" rx="12" ry="8" fill="none" stroke="currentColor" strokeWidth="0.15" className="text-primary/50" />
                    <ellipse cx="50" cy="25" rx="10" ry="10" fill="none" stroke="currentColor" strokeWidth="0.15" className="text-primary/50" />
                    <ellipse cx="78" cy="35" rx="8" ry="6" fill="none" stroke="currentColor" strokeWidth="0.15" className="text-primary/50" />
                  </svg>

                  {regions.map((r) => {
                    const isActive = selectedRegions.has(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => toggleRegion(r.id)}
                        className="absolute group"
                        style={{ left: `${r.x}%`, top: `${r.y}%`, transform: "translate(-50%, -50%)" }}
                      >
                        <div className={`relative flex items-center justify-center ${isActive ? "" : "opacity-50"}`}>
                          {isActive && (
                            <div className="absolute w-8 h-8 rounded-full bg-primary/20 animate-ping" />
                          )}
                          <div className={`w-3 h-3 rounded-full border-2 z-10 transition-all ${isActive ? "bg-primary border-primary shadow-lg shadow-primary/30" : "bg-gray-600 border-gray-500"}`} />
                        </div>
                        <div className={`absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap transition-opacity ${isActive ? "opacity-100" : "opacity-60"}`}>
                          <div className="bg-background/90 backdrop-blur border border-border/50 rounded px-2 py-1 text-center">
                            <div className="text-[9px] font-medium">{r.name}</div>
                            <div className="text-[8px] text-muted-foreground">{r.city}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  <div className="absolute bottom-3 right-3 flex items-center gap-3 bg-background/80 backdrop-blur rounded px-3 py-1.5 border border-border/30">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-[9px] text-muted-foreground">Active</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-gray-600" />
                      <span className="text-[9px] text-muted-foreground">Inactive</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground">|</span>
                    <span className="text-[9px] text-primary font-medium">{selectedRegions.size} regions</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FeaturePageLayout>
  );
}
