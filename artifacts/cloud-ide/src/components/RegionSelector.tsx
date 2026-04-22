import { useState, useEffect } from "react";
import { X, Globe, Plus, Trash2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Region { id: string; name: string; code: string; status: string; latency: number; requestCount: number; errorRate: number; }
interface Props { projectId: string; onClose: () => void; }

export function RegionSelector({ projectId, onClose }: Props) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [available, setAvailable] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/projects/${projectId}/regions`, { credentials: "include" }).then(r => r.json()),
      fetch(`${API}/regions`, { credentials: "include" }).then(r => r.json()),
    ]).then(([dep, avail]) => { setRegions(dep.regions || []); setAvailable(avail); }).finally(() => setLoading(false));
  }, [projectId]);

  const deploy = async (regionId: string) => {
    try { const res = await fetch(`${API}/projects/${projectId}/regions/${regionId}`, { method: "POST", credentials: "include" }); if (res.ok) { const r = await res.json(); setRegions(prev => [...prev, r]); } } catch {}
  };

  const remove = async (regionId: string) => {
    try { await fetch(`${API}/projects/${projectId}/regions/${regionId}`, { method: "DELETE", credentials: "include" }); setRegions(prev => prev.filter(r => r.id !== regionId)); } catch {}
  };

  const deployedIds = new Set(regions.map(r => r.id));
  const statusIcon = (s: string) => s === "healthy" ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <AlertTriangle className="w-3 h-3 text-yellow-400" />;

  if (loading) return <div className="h-full flex items-center justify-center bg-background"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="region-selector">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Multi-Region Deployment</span><span className="text-[10px] text-muted-foreground">{regions.length} active</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {regions.length > 0 && <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Regions</div>}
        {regions.map(r => (
          <div key={r.id} className="flex items-center gap-2 bg-card/50 rounded-lg p-2 border border-border/30">
            {statusIcon(r.status)}
            <div className="flex-1"><div className="text-xs font-medium">{r.name}</div><div className="text-[10px] text-muted-foreground">{r.latency}ms latency · {r.requestCount.toLocaleString()} requests · {r.errorRate.toFixed(1)}% errors</div></div>
            <button onClick={() => remove(r.id)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-2">Available Regions</div>
        {available.filter(r => !deployedIds.has(r.id)).map(r => (
          <div key={r.id} className="flex items-center gap-2 bg-card/30 rounded-lg p-2 border border-border/20">
            <Globe className="w-3 h-3 text-muted-foreground" />
            <div className="flex-1"><div className="text-xs">{r.name}</div><div className="text-[10px] text-muted-foreground">{r.code}</div></div>
            <button onClick={() => deploy(r.id)} className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-primary text-primary-foreground rounded"><Plus className="w-2.5 h-2.5" /> Deploy</button>
          </div>
        ))}
      </div>
    </div>
  );
}
