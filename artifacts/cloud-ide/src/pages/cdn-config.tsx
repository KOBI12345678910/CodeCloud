import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Globe, Shield, Zap, RefreshCw, Trash2, Plus,
  CheckCircle, Settings, HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

interface CacheRule {
  id: string;
  pattern: string;
  ttl: number;
  maxAge: number;
  staleWhileRevalidate: number;
  enabled: boolean;
  cacheControl: string;
}

interface CacheStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  bandwidthSavedMb: number;
  avgResponseTimeMs: number;
  edgeLocations: number;
  cachedAssets: number;
  totalBandwidthMb: number;
}

interface CdnConfig {
  enabled: boolean;
  provider: string;
  edgeLocations: string[];
  sslEnabled: boolean;
  http2Enabled: boolean;
  compressionEnabled: boolean;
  minifyEnabled: boolean;
}

function MiniBar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CdnConfigPage() {
  const { theme } = useTheme();
  const [projectId] = useState("demo-project");
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [rules, setRules] = useState<{ rules: CacheRule[]; defaults: CacheRule[] }>({ rules: [], defaults: [] });
  const [config, setConfig] = useState<CdnConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [newRule, setNewRule] = useState({ pattern: "", maxAge: 86400, cacheControl: "public, max-age=86400" });

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, rRes, cRes] = await Promise.all([
        fetch(api(`/projects/${projectId}/cdn/stats`)),
        fetch(api(`/projects/${projectId}/cdn/rules`)),
        fetch(api(`/projects/${projectId}/cdn/config`)),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (rRes.ok) setRules(await rRes.json());
      if (cRes.ok) setConfig(await cRes.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const purge = async () => {
    setPurging(true);
    try {
      await fetch(api(`/projects/${projectId}/cdn/purge`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setTimeout(load, 500);
    } catch {}
    setPurging(false);
  };

  const addRule = async () => {
    if (!newRule.pattern) return;
    try {
      await fetch(api(`/projects/${projectId}/cdn/rules`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newRule, ttl: newRule.maxAge, staleWhileRevalidate: Math.floor(newRule.maxAge / 10), enabled: true }),
      });
      setNewRule({ pattern: "", maxAge: 86400, cacheControl: "public, max-age=86400" });
      load();
    } catch {}
  };

  const removeRule = async (ruleId: string) => {
    try {
      await fetch(api(`/projects/${projectId}/cdn/rules/${ruleId}`), { method: "DELETE" });
      load();
    } catch {}
  };

  const dark = theme === "dark";
  const card = dark ? "bg-[#161b22] border-[#1e2533]" : "bg-white border-gray-200";

  return (
    <div className={`min-h-screen ${dark ? "bg-[#0e1117] text-gray-200" : "bg-gray-50 text-gray-900"}`} data-testid="cdn-config-page">
      <header className={`border-b ${dark ? "border-[#1e2533] bg-[#161b22]" : "border-gray-200 bg-white"} px-6 py-4`}>
        <div className="flex items-center justify-between max-w-[1000px] mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">CDN Configuration</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={load}>
              <RefreshCw size={12} /> Refresh
            </Button>
            <Button variant="destructive" size="sm" className="h-8 text-xs gap-1.5" onClick={purge} disabled={purging}>
              <Trash2 size={12} /> {purging ? "Purging..." : "Purge All Cache"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Hit Rate", value: `${stats?.hitRate || 0}%`, icon: Zap, color: "text-green-400", bg: "bg-green-400/10" },
                { label: "Bandwidth Saved", value: `${stats?.bandwidthSavedMb || 0} MB`, icon: HardDrive, color: "text-blue-400", bg: "bg-blue-400/10" },
                { label: "Avg Response", value: `${stats?.avgResponseTimeMs || 0}ms`, icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10" },
                { label: "Edge Locations", value: `${stats?.edgeLocations || 0}`, icon: Globe, color: "text-purple-400", bg: "bg-purple-400/10" },
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

            {config && (
              <div className={`rounded-xl border p-4 ${card}`}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Settings size={14} /> CDN Settings</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Provider", value: config.provider },
                    { label: "SSL", value: config.sslEnabled, bool: true },
                    { label: "HTTP/2", value: config.http2Enabled, bool: true },
                    { label: "Compression", value: config.compressionEnabled, bool: true },
                    { label: "Minification", value: config.minifyEnabled, bool: true },
                    { label: "Edge Locations", value: config.edgeLocations.length },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      {item.bool !== undefined ? (
                        <span className={`flex items-center gap-1 text-xs ${item.value ? "text-green-400" : "text-red-400"}`}>
                          {item.value ? <CheckCircle size={12} /> : null}
                          {item.value ? "Enabled" : "Disabled"}
                        </span>
                      ) : (
                        <span className="text-sm font-medium">{String(item.value)}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground">Regions: </span>
                  <span className="text-xs">{config.edgeLocations.join(", ")}</span>
                </div>
              </div>
            )}

            <div className={`rounded-xl border overflow-hidden ${card}`}>
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                <span className="text-sm font-semibold">Default Cache Rules</span>
              </div>
              <div className="divide-y divide-border/30">
                {rules.defaults.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${rule.enabled ? "bg-green-400" : "bg-gray-500"}`} />
                      <span className="text-sm font-mono">{rule.pattern}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{rule.cacheControl}</span>
                      <span>{rule.maxAge > 86400 ? `${Math.floor(rule.maxAge / 86400)}d` : rule.maxAge > 3600 ? `${Math.floor(rule.maxAge / 3600)}h` : rule.maxAge > 0 ? `${Math.floor(rule.maxAge / 60)}m` : "no-cache"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-xl border overflow-hidden ${card}`}>
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                <span className="text-sm font-semibold">Custom Cache Rules</span>
              </div>
              <div className="px-4 py-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <input className={`flex-1 text-sm px-3 py-1.5 rounded border ${dark ? "bg-[#0e1117] border-[#2d3548]" : "bg-gray-50 border-gray-200"}`}
                    placeholder="Pattern (e.g. /assets/*)" value={newRule.pattern} onChange={e => setNewRule({ ...newRule, pattern: e.target.value })} />
                  <input className={`w-24 text-sm px-3 py-1.5 rounded border ${dark ? "bg-[#0e1117] border-[#2d3548]" : "bg-gray-50 border-gray-200"}`}
                    type="number" placeholder="Max Age" value={newRule.maxAge} onChange={e => setNewRule({ ...newRule, maxAge: parseInt(e.target.value) || 0 })} />
                  <Button size="sm" className="h-8 text-xs gap-1" onClick={addRule}><Plus size={12} /> Add</Button>
                </div>
              </div>
              {rules.rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No custom rules configured</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {rules.rules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${rule.enabled ? "bg-green-400" : "bg-gray-500"}`} />
                        <span className="text-sm font-mono">{rule.pattern}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{rule.maxAge}s</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeRule(rule.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {stats && (
              <div className={`rounded-xl border p-4 ${card}`}>
                <h3 className="text-sm font-semibold mb-3">Cache Performance</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Hit Rate</span>
                      <span>{stats.hitRate}% ({stats.cacheHits.toLocaleString()} / {stats.totalRequests.toLocaleString()})</span>
                    </div>
                    <MiniBar value={stats.hitRate} max={100} color="bg-green-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cached Assets</span>
                      <span>{stats.cachedAssets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Bandwidth</span>
                      <span>{stats.totalBandwidthMb.toLocaleString()} MB</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
