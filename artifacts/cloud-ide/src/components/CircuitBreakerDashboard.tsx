import { useState } from "react";
import { X, Zap, ShieldOff, ShieldCheck, ShieldAlert, RotateCcw, ToggleLeft, ToggleRight, Clock, AlertTriangle, TrendingUp } from "lucide-react";

interface Props { onClose: () => void; }

type CBState = "closed" | "open" | "half-open";

interface CircuitBreaker {
  id: string;
  endpoint: string;
  method: string;
  state: CBState;
  failureCount: number;
  successCount: number;
  failureThreshold: number;
  successThreshold: number;
  tripCount: number;
  lastTrippedAt: string | null;
  recoveryTimeMs: number;
  nextRetryAt: string | null;
  avgResponseMs: number;
  errorRate: number;
  manualOverride: boolean;
  history: { timestamp: string; state: CBState }[];
}

const NOW = Date.now();
const BREAKERS: CircuitBreaker[] = [
  {
    id: "cb1", endpoint: "/api/users", method: "GET", state: "closed",
    failureCount: 1, successCount: 847, failureThreshold: 5, successThreshold: 3,
    tripCount: 2, lastTrippedAt: new Date(NOW - 86400000).toISOString(), recoveryTimeMs: 30000,
    nextRetryAt: null, avgResponseMs: 42, errorRate: 0.12, manualOverride: false,
    history: [
      { timestamp: new Date(NOW - 86400000).toISOString(), state: "open" },
      { timestamp: new Date(NOW - 86370000).toISOString(), state: "half-open" },
      { timestamp: new Date(NOW - 86340000).toISOString(), state: "closed" },
    ],
  },
  {
    id: "cb2", endpoint: "/api/payments/process", method: "POST", state: "open",
    failureCount: 8, successCount: 0, failureThreshold: 5, successThreshold: 3,
    tripCount: 5, lastTrippedAt: new Date(NOW - 120000).toISOString(), recoveryTimeMs: 60000,
    nextRetryAt: new Date(NOW + 40000).toISOString(), avgResponseMs: 0, errorRate: 100, manualOverride: false,
    history: [
      { timestamp: new Date(NOW - 600000).toISOString(), state: "closed" },
      { timestamp: new Date(NOW - 300000).toISOString(), state: "open" },
      { timestamp: new Date(NOW - 240000).toISOString(), state: "half-open" },
      { timestamp: new Date(NOW - 180000).toISOString(), state: "open" },
      { timestamp: new Date(NOW - 120000).toISOString(), state: "open" },
    ],
  },
  {
    id: "cb3", endpoint: "/api/search", method: "GET", state: "half-open",
    failureCount: 0, successCount: 1, failureThreshold: 3, successThreshold: 3,
    tripCount: 1, lastTrippedAt: new Date(NOW - 60000).toISOString(), recoveryTimeMs: 30000,
    nextRetryAt: null, avgResponseMs: 180, errorRate: 15.4, manualOverride: false,
    history: [
      { timestamp: new Date(NOW - 120000).toISOString(), state: "closed" },
      { timestamp: new Date(NOW - 60000).toISOString(), state: "open" },
      { timestamp: new Date(NOW - 30000).toISOString(), state: "half-open" },
    ],
  },
  {
    id: "cb4", endpoint: "/api/notifications/send", method: "POST", state: "closed",
    failureCount: 0, successCount: 2341, failureThreshold: 5, successThreshold: 3,
    tripCount: 0, lastTrippedAt: null, recoveryTimeMs: 30000,
    nextRetryAt: null, avgResponseMs: 28, errorRate: 0, manualOverride: false,
    history: [],
  },
  {
    id: "cb5", endpoint: "/api/files/upload", method: "POST", state: "closed",
    failureCount: 2, successCount: 562, failureThreshold: 5, successThreshold: 3,
    tripCount: 1, lastTrippedAt: new Date(NOW - 7200000).toISOString(), recoveryTimeMs: 45000,
    nextRetryAt: null, avgResponseMs: 95, errorRate: 0.36, manualOverride: true,
    history: [
      { timestamp: new Date(NOW - 7200000).toISOString(), state: "open" },
      { timestamp: new Date(NOW - 7155000).toISOString(), state: "half-open" },
      { timestamp: new Date(NOW - 7140000).toISOString(), state: "closed" },
    ],
  },
  {
    id: "cb6", endpoint: "/api/deploy/trigger", method: "POST", state: "open",
    failureCount: 6, successCount: 0, failureThreshold: 3, successThreshold: 5,
    tripCount: 3, lastTrippedAt: new Date(NOW - 45000).toISOString(), recoveryTimeMs: 90000,
    nextRetryAt: new Date(NOW + 45000).toISOString(), avgResponseMs: 0, errorRate: 100, manualOverride: false,
    history: [
      { timestamp: new Date(NOW - 300000).toISOString(), state: "open" },
      { timestamp: new Date(NOW - 210000).toISOString(), state: "half-open" },
      { timestamp: new Date(NOW - 200000).toISOString(), state: "open" },
      { timestamp: new Date(NOW - 45000).toISOString(), state: "open" },
    ],
  },
];

const STATE_CONFIG: Record<CBState, { color: string; bg: string; icon: typeof ShieldCheck; label: string }> = {
  closed: { color: "text-green-400", bg: "bg-green-400/10", icon: ShieldCheck, label: "Closed" },
  open: { color: "text-red-400", bg: "bg-red-400/10", icon: ShieldOff, label: "Open" },
  "half-open": { color: "text-yellow-400", bg: "bg-yellow-400/10", icon: ShieldAlert, label: "Half-Open" },
};

function timeAgo(ts: string | null): string {
  if (!ts) return "never";
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeUntil(ts: string | null): string {
  if (!ts) return "-";
  const s = Math.max(0, Math.floor((new Date(ts).getTime() - Date.now()) / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function CircuitBreakerDashboard({ onClose }: Props) {
  const [filter, setFilter] = useState<"all" | CBState>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = filter === "all" ? BREAKERS : BREAKERS.filter(b => b.state === filter);
  const counts = { closed: BREAKERS.filter(b => b.state === "closed").length, open: BREAKERS.filter(b => b.state === "open").length, "half-open": BREAKERS.filter(b => b.state === "half-open").length };
  const detail = selected ? BREAKERS.find(b => b.id === selected) : null;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="circuit-breaker-dashboard">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Circuit Breakers</span>
          <div className="flex gap-1.5 ml-2">
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-400/10 text-green-400">{counts.closed} closed</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400">{counts.open} open</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400">{counts["half-open"]} half-open</span>
          </div>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        {(["all", "closed", "open", "half-open"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-2 py-0.5 text-[9px] rounded capitalize ${filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>{f === "all" ? `All (${BREAKERS.length})` : `${f} (${counts[f]})`}</button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filtered.map(cb => {
            const cfg = STATE_CONFIG[cb.state];
            const Icon = cfg.icon;
            return (
              <div key={cb.id} onClick={() => setSelected(cb.id === selected ? null : cb.id)} className={`bg-card/50 rounded-lg border p-2.5 cursor-pointer transition-colors hover:bg-muted/20 ${cb.id === selected ? "border-primary/40" : "border-border/30"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    <span className="text-[9px] font-mono">{cb.method}</span>
                    <span className="text-[10px] font-medium">{cb.endpoint}</span>
                    {cb.manualOverride && <span className="text-[7px] px-1 py-0.5 rounded bg-purple-400/10 text-purple-400">override</span>}
                  </div>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="grid grid-cols-6 gap-2 text-[8px]">
                  <div><span className="text-muted-foreground">Failures: </span><span className={cb.failureCount >= cb.failureThreshold ? "text-red-400 font-medium" : ""}>{cb.failureCount}/{cb.failureThreshold}</span></div>
                  <div><span className="text-muted-foreground">Success: </span><span>{cb.successCount}</span></div>
                  <div><span className="text-muted-foreground">Trips: </span><span className={cb.tripCount > 3 ? "text-red-400 font-medium" : ""}>{cb.tripCount}</span></div>
                  <div><span className="text-muted-foreground">Err: </span><span className={cb.errorRate > 50 ? "text-red-400" : cb.errorRate > 5 ? "text-yellow-400" : "text-green-400"}>{cb.errorRate}%</span></div>
                  <div><span className="text-muted-foreground">Latency: </span><span>{cb.avgResponseMs}ms</span></div>
                  <div><span className="text-muted-foreground">Recovery: </span><span>{cb.recoveryTimeMs / 1000}s</span></div>
                </div>
                {cb.state === "open" && cb.nextRetryAt && (
                  <div className="mt-1 flex items-center gap-1 text-[8px] text-yellow-400">
                    <Clock className="w-2.5 h-2.5" />
                    Next retry in {timeUntil(cb.nextRetryAt)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {detail && (
          <div className="w-64 border-l border-border/30 overflow-y-auto p-3 space-y-3 shrink-0">
            <div className="text-[10px] font-medium">Details</div>
            <div className="space-y-1.5 text-[9px]">
              <div><span className="text-muted-foreground">Endpoint: </span><span className="font-mono">{detail.method} {detail.endpoint}</span></div>
              <div><span className="text-muted-foreground">State: </span><span className={STATE_CONFIG[detail.state].color}>{STATE_CONFIG[detail.state].label}</span></div>
              <div><span className="text-muted-foreground">Failure threshold: </span>{detail.failureThreshold}</div>
              <div><span className="text-muted-foreground">Success threshold: </span>{detail.successThreshold}</div>
              <div><span className="text-muted-foreground">Recovery time: </span>{detail.recoveryTimeMs / 1000}s</div>
              <div><span className="text-muted-foreground">Last tripped: </span>{timeAgo(detail.lastTrippedAt)}</div>
              <div><span className="text-muted-foreground">Total trips: </span>{detail.tripCount}</div>
              <div><span className="text-muted-foreground">Override: </span>{detail.manualOverride ? <span className="text-purple-400">active</span> : "none"}</div>
            </div>
            <div className="flex gap-1">
              <button className="flex-1 px-2 py-1 text-[8px] rounded bg-green-400/10 text-green-400 hover:bg-green-400/20 flex items-center justify-center gap-1"><RotateCcw className="w-2.5 h-2.5" />Reset</button>
              <button className="flex-1 px-2 py-1 text-[8px] rounded bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 flex items-center justify-center gap-1">
                {detail.manualOverride ? <><ToggleRight className="w-3 h-3" />Remove</> : <><ToggleLeft className="w-3 h-3" />Override</>}
              </button>
            </div>
            {detail.history.length > 0 && (
              <div>
                <div className="text-[9px] font-medium mb-1">State History</div>
                <div className="space-y-1">
                  {detail.history.map((h, i) => {
                    const hc = STATE_CONFIG[h.state];
                    return (
                      <div key={i} className="flex items-center gap-2 text-[8px]">
                        <div className={`w-1.5 h-1.5 rounded-full ${hc.bg.replace("/10", "")}`} style={{ background: hc.color.includes("green") ? "#4ade80" : hc.color.includes("red") ? "#f87171" : "#facc15" }} />
                        <span className={hc.color}>{hc.label}</span>
                        <span className="text-muted-foreground ml-auto">{timeAgo(h.timestamp)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
