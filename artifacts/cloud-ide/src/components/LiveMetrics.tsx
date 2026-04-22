import { useState, useEffect, useRef } from "react";
import { X, Activity, Loader2 } from "lucide-react";

interface Props { projectId: string; onClose: () => void; }

interface MetricPoint { timestamp: number; value: number; }

export function LiveMetrics({ projectId, onClose }: Props) {
  const [metrics, setMetrics] = useState<Record<string, MetricPoint[]>>({ requests: [], errors: [], responseTime: [], cpu: [], memory: [] });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setMetrics(prev => {
        const add = (key: string, min: number, max: number) => [...(prev[key] || []).slice(-30), { timestamp: now, value: min + Math.random() * (max - min) }];
        return { requests: add("requests", 100, 500), errors: add("errors", 0, 10), responseTime: add("responseTime", 50, 200), cpu: add("cpu", 20, 80), memory: add("memory", 40, 70) };
      });
    };
    tick();
    intervalRef.current = setInterval(tick, 2000);
    return () => clearInterval(intervalRef.current);
  }, [projectId]);

  const METRIC_CONFIG = [
    { key: "requests", label: "Requests/s", color: "text-blue-400", bgColor: "bg-blue-400", format: (v: number) => Math.round(v).toString() },
    { key: "errors", label: "Errors/s", color: "text-red-400", bgColor: "bg-red-400", format: (v: number) => v.toFixed(1) },
    { key: "responseTime", label: "Response (ms)", color: "text-green-400", bgColor: "bg-green-400", format: (v: number) => Math.round(v).toString() },
    { key: "cpu", label: "CPU %", color: "text-orange-400", bgColor: "bg-orange-400", format: (v: number) => Math.round(v).toString() },
    { key: "memory", label: "Memory %", color: "text-purple-400", bgColor: "bg-purple-400", format: (v: number) => Math.round(v).toString() },
  ];

  return (
    <div className="h-full flex flex-col bg-background" data-testid="live-metrics">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Live Metrics</span><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {METRIC_CONFIG.map(cfg => {
          const points = metrics[cfg.key] || [];
          const latest = points[points.length - 1]?.value ?? 0;
          const maxVal = Math.max(...points.map(p => p.value), 1);
          return (
            <div key={cfg.key} className="bg-card/50 rounded border border-border/30 p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                <span className={`text-xs font-bold ${cfg.color}`}>{cfg.format(latest)}</span>
              </div>
              <div className="flex items-end gap-[1px] h-6">
                {points.map((p, i) => (
                  <div key={i} className={`flex-1 ${cfg.bgColor}/40 rounded-t`} style={{ height: `${Math.max(5, (p.value / maxVal) * 100)}%` }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
