import { useState, useEffect, useCallback } from "react";
import { X, Globe, Loader2, CheckCircle2, AlertTriangle, XCircle, Activity, Rocket, RefreshCw, MapPin } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

type RegionCode = "us-east" | "eu-west" | "ap-southeast";
type Health = "healthy" | "degraded" | "down";
type Status = "pending" | "deploying" | "live" | "failed" | "stopped";

interface Preset { code: RegionCode; name: string; location: string; lat: number; lon: number; }
interface RegionRow {
  id: string;
  deploymentId: string;
  region: RegionCode;
  status: Status;
  health: Health;
  latencyMs: number;
  endpoint: string | null;
  lastHealthCheckAt: string | null;
  lastHealthyAt: string | null;
  consecutiveFailures: number;
  name?: string;
  location?: string;
}

interface Props { projectId: string; onClose: () => void; }

const HEALTH_COLOR: Record<Health, string> = {
  healthy: "text-green-400",
  degraded: "text-yellow-400",
  down: "text-red-400",
};

const HEALTH_ICON = (h: Health) => {
  if (h === "healthy") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (h === "degraded") return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
};

export function DeploymentRegions({ projectId, onClose }: Props) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<RegionCode>>(new Set(["us-east"]));
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [routing, setRouting] = useState<{ region: RegionCode | null; regionName?: string; clientCountry?: string; latencyMs?: number; reason?: string } | null>(null);
  const [testIp, setTestIp] = useState("");
  const [stats, setStats] = useState<Array<{ region: RegionCode; name?: string; summary: { p50: number; p95: number; avg: number; min: number; max: number; count: number } }>>([]);

  const refresh = useCallback(async () => {
    try {
      const [presetsRes, latestRes] = await Promise.all([
        fetch(`${API}/regions/presets`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${API}/projects/${projectId}/deployments/regions/latest`, { credentials: "include" }).then((r) => r.json()),
      ]);
      setPresets(presetsRes);
      setRegions(latestRes.regions || []);
      const depId = latestRes.deployment?.id || null;
      setDeploymentId(depId);
      if (depId) {
        try {
          const s = await fetch(`${API}/projects/${projectId}/deployments/${depId}/regions/latency-stats`, { credentials: "include" }).then((r) => r.json());
          setStats(Array.isArray(s) ? s : []);
        } catch { setStats([]); }
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  const toggle = (code: RegionCode) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const deploy = async () => {
    if (selected.size === 0 || deploying) return;
    setDeploying(true);
    try {
      const res = await fetch(`${API}/projects/${projectId}/deployments/regions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regions: Array.from(selected) }),
      });
      if (res.ok) {
        const data = await res.json();
        setRegions(data.regions);
        setDeploymentId(data.deployment.id);
        setTimeout(refresh, 2500);
      }
    } finally {
      setDeploying(false);
    }
  };

  const runHealthCheck = async () => {
    if (!deploymentId) return;
    await fetch(`${API}/projects/${projectId}/deployments/${deploymentId}/regions/health-check`, {
      method: "POST", credentials: "include",
    });
    refresh();
  };

  const resolveRoute = async () => {
    if (!deploymentId) return;
    const url = new URL(`${API}/projects/${projectId}/deployments/${deploymentId}/regions/route`, window.location.origin);
    if (testIp) url.searchParams.set("ip", testIp);
    const res = await fetch(url.toString().replace(window.location.origin, ""), { credentials: "include" });
    if (res.ok) setRouting(await res.json());
  };

  if (loading) return <div className="h-full flex items-center justify-center bg-background"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const liveCount = regions.filter((r) => r.status === "live" && r.health !== "down").length;
  const avgLatency = regions.length ? Math.round(regions.reduce((s, r) => s + r.latencyMs, 0) / regions.length) : 0;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="deployment-regions">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Geo-Routed Deployments</span>
          <span className="text-[10px] text-muted-foreground">{liveCount} healthy · avg {avgLatency}ms</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={refresh} className="p-1 hover:bg-muted rounded" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Select Regions</div>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p) => {
              const active = selected.has(p.code);
              return (
                <button
                  key={p.code}
                  onClick={() => toggle(p.code)}
                  data-testid={`region-toggle-${p.code}`}
                  className={`flex flex-col items-start gap-1 p-2 rounded border text-left transition-colors ${active ? "border-primary bg-primary/10" : "border-border/30 bg-card/30 hover:bg-card/60"}`}
                >
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs font-medium">{p.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{p.location}</span>
                  <span className="text-[10px] text-muted-foreground">{p.code}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={deploy}
            disabled={deploying || selected.size === 0}
            data-testid="deploy-regions-btn"
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50"
          >
            {deploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
            {deploying ? "Deploying..." : `Deploy to ${selected.size} region${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Regions</div>
            {deploymentId && (
              <button onClick={runHealthCheck} className="text-[10px] text-primary hover:underline flex items-center gap-1" data-testid="health-check-btn">
                <Activity className="w-3 h-3" /> Run Health Check
              </button>
            )}
          </div>
          {regions.length === 0 ? (
            <div className="text-xs text-muted-foreground p-3 text-center border border-dashed border-border/30 rounded">No regions deployed yet.</div>
          ) : (
            <div className="space-y-1.5">
              {regions.map((r) => (
                <div key={r.id} data-testid={`region-row-${r.region}`} className="flex items-center gap-2 bg-card/50 rounded p-2 border border-border/30">
                  {HEALTH_ICON(r.health)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{r.name || r.region}</span>
                      <span className={`text-[10px] ${HEALTH_COLOR[r.health]}`}>{r.health}</span>
                      <span className="text-[10px] text-muted-foreground">· {r.status}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {r.location} · {r.latencyMs}ms
                      {r.consecutiveFailures > 0 && <span className="text-red-400"> · {r.consecutiveFailures} fails</span>}
                      {r.endpoint && <span> · {r.endpoint}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {stats.length > 0 && (
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Latency Stats (per region)</div>
            <div className="space-y-1">
              {stats.map((s) => (
                <div key={s.region} data-testid={`stats-row-${s.region}`} className="flex items-center gap-2 text-[10px] bg-card/30 rounded px-2 py-1 border border-border/20">
                  <span className="font-medium w-20">{s.name || s.region}</span>
                  <span className="text-muted-foreground">samples: {s.summary.count}</span>
                  <span className="text-muted-foreground">avg: {s.summary.avg}ms</span>
                  <span className="text-muted-foreground">p50: {s.summary.p50}ms</span>
                  <span className="text-muted-foreground">p95: {s.summary.p95}ms</span>
                  <span className="text-muted-foreground">min/max: {s.summary.min}/{s.summary.max}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {deploymentId && (
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Test Routing</div>
            <div className="flex gap-2">
              <input
                value={testIp}
                onChange={(e) => setTestIp(e.target.value)}
                placeholder="IP address (e.g. 8.8.8.8)"
                className="flex-1 bg-card/50 border border-border/30 rounded px-2 py-1 text-xs"
                data-testid="test-ip-input"
              />
              <button onClick={resolveRoute} className="px-3 py-1 text-xs bg-primary/80 text-primary-foreground rounded" data-testid="resolve-route-btn">Resolve</button>
            </div>
            {routing && (
              <div className="mt-2 p-2 bg-card/50 rounded border border-border/30 text-[10px]">
                {routing.region ? (
                  <>
                    <div>Routed to: <span className="text-primary font-medium">{routing.regionName} ({routing.region})</span></div>
                    <div className="text-muted-foreground">Client country: {routing.clientCountry} · Latency: {routing.latencyMs}ms</div>
                  </>
                ) : (
                  <div className="text-red-400">No healthy region available ({routing.reason})</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
