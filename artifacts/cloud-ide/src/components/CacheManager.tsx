import { useState, useEffect } from "react";
import { X, Zap, Trash2, Loader2, BarChart3, RefreshCw } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const formatBytes = (b: number) => b >= 1073741824 ? `${(b / 1073741824).toFixed(1)} GB` : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(1)} KB`;

export function CacheManager({ projectId, onClose }: Props) {
  const [stats, setStats] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [sRes, rRes] = await Promise.all([
          fetch(`${API}/projects/${projectId}/cdn/stats`, { credentials: "include" }),
          fetch(`${API}/projects/${projectId}/cdn/rules`, { credentials: "include" }),
        ]);
        if (sRes.ok) setStats(await sRes.json());
        if (rRes.ok) setRules(await rRes.json());
      } catch {} finally { setLoading(false); }
    })();
  }, [projectId]);

  const purge = async () => {
    setPurging(true);
    try { await fetch(`${API}/projects/${projectId}/cdn/purge`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }); } catch {} finally { setPurging(false); }
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="cache-manager">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">CDN Cache</span></div>
        <div className="flex items-center gap-1">
          <button onClick={purge} disabled={purging} className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-red-500/10 text-red-400 rounded hover:bg-red-500/20">{purging ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />} Purge All</button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {stats && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-card/50 rounded border border-border/30 p-2 text-center"><div className="text-sm font-bold text-green-400">{stats.hitRate}%</div><div className="text-[9px] text-muted-foreground">Hit Rate</div></div>
                <div className="bg-card/50 rounded border border-border/30 p-2 text-center"><div className="text-sm font-bold">{(stats.cacheHits / 1000).toFixed(0)}k</div><div className="text-[9px] text-muted-foreground">Cache Hits</div></div>
                <div className="bg-card/50 rounded border border-border/30 p-2 text-center"><div className="text-sm font-bold">{formatBytes(stats.bandwidth.cached)}</div><div className="text-[9px] text-muted-foreground">Bandwidth Saved</div></div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Top Cached Paths</div>
                {stats.topCachedPaths.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="font-mono flex-1 truncate">{p.path}</span>
                    <div className="w-20 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-400/60 rounded-full" style={{ width: `${(p.hits / stats.topCachedPaths[0].hits) * 100}%` }} /></div>
                    <span className="text-muted-foreground w-12 text-right">{(p.hits / 1000).toFixed(1)}k</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Cache Rules</div>
            {rules.map((r: any) => (
              <div key={r.id} className="flex items-center gap-2 bg-card/50 rounded border border-border/30 p-2 text-[10px]">
                <span className={`w-1.5 h-1.5 rounded-full ${r.enabled ? "bg-green-400" : "bg-muted-foreground"}`} />
                <span className="font-mono flex-1">{r.pattern}</span>
                <span className="text-muted-foreground">TTL: {r.ttl > 0 ? `${r.ttl}s` : "none"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
