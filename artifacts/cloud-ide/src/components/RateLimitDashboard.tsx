import { useState } from "react";
import { X, Activity, Clock, AlertTriangle, ArrowUp } from "lucide-react";

interface Props { onClose: () => void; }

function ProgressRing({ percentage, size = 60, stroke = 4 }: { percentage: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;
  const color = percentage >= 90 ? "#ef4444" : percentage >= 70 ? "#eab308" : "#22c55e";
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-muted/20" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

export function RateLimitDashboard({ onClose }: Props) {
  const limits = [
    { name: "API Requests", used: 8432, limit: 10000, resetIn: "42 min", period: "hourly" },
    { name: "File Operations", used: 245, limit: 500, resetIn: "42 min", period: "hourly" },
    { name: "Deployments", used: 18, limit: 25, resetIn: "6 hr", period: "daily" },
    { name: "AI Completions", used: 89, limit: 100, resetIn: "42 min", period: "hourly" },
    { name: "WebSocket Connections", used: 3, limit: 10, resetIn: "N/A", period: "concurrent" },
  ];

  const history = Array.from({ length: 24 }, (_, i) => ({ hour: `${23 - i}:00`, requests: Math.floor(Math.random() * 800) + 200 })).reverse();

  return (
    <div className="h-full flex flex-col bg-background" data-testid="rate-limit-dashboard">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Rate Limits</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="grid grid-cols-5 gap-2">
          {limits.map(l => {
            const pct = Math.round((l.used / l.limit) * 100);
            return (
              <div key={l.name} className="bg-card/50 rounded-lg p-2 border border-border/30 text-center">
                <div className="text-[10px] text-muted-foreground mb-1 truncate">{l.name}</div>
                <div className="flex justify-center mb-1 relative">
                  <ProgressRing percentage={pct} size={48} stroke={3} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{pct}%</span>
                </div>
                <div className="text-[10px] font-mono">{l.used.toLocaleString()}/{l.limit.toLocaleString()}</div>
                <div className="flex items-center justify-center gap-0.5 text-[9px] text-muted-foreground mt-0.5">
                  <Clock className="w-2.5 h-2.5" /> {l.resetIn}
                </div>
                {pct >= 80 && (
                  <div className="flex items-center justify-center gap-0.5 mt-1 text-[9px] text-yellow-400">
                    <AlertTriangle className="w-2.5 h-2.5" /> Near limit
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="bg-card/50 rounded-lg p-2 border border-border/30">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Request History (24h)</div>
          <div className="flex items-end gap-px h-16">
            {history.map((h, i) => (
              <div key={i} className="flex-1 bg-primary/40 rounded-t-sm hover:bg-primary/60 transition-colors" style={{ height: `${(h.requests / 1000) * 100}%` }} title={`${h.hour}: ${h.requests} requests`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg p-2">
          <ArrowUp className="w-4 h-4 text-primary shrink-0" />
          <div className="text-xs"><span className="font-medium">Upgrade to Pro</span> <span className="text-muted-foreground">for 10x higher rate limits and priority API access.</span></div>
        </div>
      </div>
    </div>
  );
}
