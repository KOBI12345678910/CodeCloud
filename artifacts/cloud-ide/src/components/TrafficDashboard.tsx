import { useState, useEffect } from "react";
import { X, Globe, Activity, Loader2, RefreshCw } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Props { projectId: string; onClose: () => void; }

export function TrafficDashboard({ projectId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState("24h");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try { const res = await fetch(`${API}/projects/${projectId}/traffic?period=${period}`, { credentials: "include" }); if (res.ok) setData(await res.json()); } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [projectId, period]);

  if (loading) return <div className="h-full flex items-center justify-center bg-background"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="traffic-dashboard">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Traffic Analytics</span></div>
        <div className="flex items-center gap-1">
          {["24h", "7d", "30d"].map(p => <button key={p} onClick={() => setPeriod(p)} className={`px-1.5 py-0.5 text-[10px] rounded ${period === p ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>{p}</button>)}
          <button onClick={fetchData} className="p-0.5 hover:bg-muted rounded ml-1"><RefreshCw className="w-3 h-3" /></button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded ml-1"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {data && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><div className="text-lg font-bold">{data.totalVisitors.toLocaleString()}</div><div className="text-[10px] text-muted-foreground">Visitors</div></div>
            <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><div className="text-lg font-bold">{data.totalRequests.toLocaleString()}</div><div className="text-[10px] text-muted-foreground">Requests</div></div>
            <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><div className="text-lg font-bold">{Object.keys(data.countries || {}).length}</div><div className="text-[10px] text-muted-foreground">Countries</div></div>
          </div>
          <div className="bg-card/50 rounded-lg p-2 border border-border/30">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Visitors Over Time</div>
            <div className="flex items-end gap-px h-14">{data.visitors?.slice(-48).map((v: any, i: number) => <div key={i} className="flex-1 bg-primary/40 rounded-t-sm" style={{ height: `${Math.max(2, (v.count / Math.max(...data.visitors.map((x: any) => x.count))) * 100)}%` }} />)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card/50 rounded-lg p-2 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Top Paths</div>
              {data.topPaths?.map((p: any) => <div key={p.path} className="flex items-center justify-between text-[11px] py-0.5"><span className="font-mono truncate flex-1">{p.path}</span><span className="text-muted-foreground ml-2">{p.count}</span></div>)}
            </div>
            <div className="bg-card/50 rounded-lg p-2 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Status Codes</div>
              {Object.entries(data.statusCodes || {}).map(([code, count]) => <div key={code} className="flex items-center justify-between text-[11px] py-0.5"><span className={`font-mono ${code.startsWith("2") ? "text-green-400" : code.startsWith("4") ? "text-yellow-400" : code.startsWith("5") ? "text-red-400" : "text-muted-foreground"}`}>{code}</span><span className="text-muted-foreground">{String(count)}</span></div>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card/50 rounded-lg p-2 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Devices</div>
              {Object.entries(data.devices || {}).map(([dev, pct]) => <div key={dev} className="flex items-center justify-between text-[11px] py-0.5"><span>{dev}</span><span className="text-muted-foreground">{String(pct)}%</span></div>)}
            </div>
            <div className="bg-card/50 rounded-lg p-2 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Referrers</div>
              {data.referrers?.map((r: any) => <div key={r.source} className="flex items-center justify-between text-[11px] py-0.5"><span>{r.source}</span><span className="text-muted-foreground">{r.count}</span></div>)}
            </div>
          </div>
          <div className="bg-card/50 rounded-lg p-2 border border-border/30">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Top Countries</div>
            <div className="grid grid-cols-3 gap-1">{data.countries?.map((c: any) => <div key={c.code} className="flex items-center gap-1.5 text-[11px] py-0.5"><span className="font-bold">{c.code}</span><span className="flex-1 truncate text-muted-foreground">{c.name}</span><span>{c.count}</span></div>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
