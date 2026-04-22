import { useState } from "react";
import { X, Network, Wifi, ArrowRight, Shield } from "lucide-react";

interface Props { projectId: string; onClose: () => void; }

interface Connection { from: string; to: string; bandwidth: string; latency: number; packetLoss: number; status: string; }

export function NetworkDashboard({ projectId, onClose }: Props) {
  const [connections] = useState<Connection[]>([
    { from: "web-app", to: "api-server", bandwidth: "12.5 MB/s", latency: 2, packetLoss: 0, status: "healthy" },
    { from: "api-server", to: "database", bandwidth: "8.3 MB/s", latency: 1, packetLoss: 0, status: "healthy" },
    { from: "api-server", to: "redis", bandwidth: "45.2 MB/s", latency: 0.5, packetLoss: 0, status: "healthy" },
    { from: "worker", to: "database", bandwidth: "3.1 MB/s", latency: 1, packetLoss: 0.1, status: "degraded" },
    { from: "web-app", to: "cdn", bandwidth: "95.0 MB/s", latency: 15, packetLoss: 0, status: "healthy" },
  ]);

  const statusColor = (s: string) => s === "healthy" ? "text-green-400" : s === "degraded" ? "text-yellow-400" : "text-red-400";

  return (
    <div className="h-full flex flex-col bg-background" data-testid="network-dashboard">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Network className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Network Dashboard</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><div className="text-lg font-bold text-green-400">{connections.filter(c => c.status === "healthy").length}</div><div className="text-[10px] text-muted-foreground">Healthy</div></div>
          <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><div className="text-lg font-bold text-yellow-400">{connections.filter(c => c.status === "degraded").length}</div><div className="text-[10px] text-muted-foreground">Degraded</div></div>
          <div className="bg-card/50 rounded-lg p-2 border border-border/30 text-center"><div className="text-lg font-bold">{connections.length}</div><div className="text-[10px] text-muted-foreground">Total</div></div>
        </div>
        <div className="space-y-1">
          {connections.map((c, i) => (
            <div key={i} className="bg-card/50 rounded-lg p-2 border border-border/30">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono font-bold">{c.from}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono font-bold">{c.to}</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold ${statusColor(c.status)} bg-current/10`}>{c.status}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                <span><Wifi className="w-2.5 h-2.5 inline" /> {c.bandwidth}</span>
                <span>Latency: {c.latency}ms</span>
                <span className={c.packetLoss > 0 ? "text-yellow-400" : ""}>Loss: {c.packetLoss}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
