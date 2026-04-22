import React, { useState } from "react";
import {
  Activity, Camera, AlertTriangle, TrendingUp, RefreshCw, X,
  ChevronDown, ChevronRight, Trash2, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Snapshot {
  id: string;
  timestamp: Date;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  gcCount: number;
  gcPauseMs: number;
}

interface MemoryLeak {
  id: string;
  detectedAt: Date;
  growthRateMBPerHour: number;
  severity: "low" | "medium" | "high";
  source: string;
}

interface MemoryProfilerProps {
  onClose?: () => void;
}

const SAMPLE_SNAPSHOTS: Snapshot[] = [
  { id: "s1", timestamp: new Date(Date.now() - 3600000), heapUsedMB: 128, heapTotalMB: 256, rssMB: 300, gcCount: 45, gcPauseMs: 12 },
  { id: "s2", timestamp: new Date(Date.now() - 2700000), heapUsedMB: 145, heapTotalMB: 256, rssMB: 312, gcCount: 52, gcPauseMs: 15 },
  { id: "s3", timestamp: new Date(Date.now() - 1800000), heapUsedMB: 162, heapTotalMB: 256, rssMB: 328, gcCount: 61, gcPauseMs: 18 },
  { id: "s4", timestamp: new Date(Date.now() - 900000), heapUsedMB: 178, heapTotalMB: 256, rssMB: 342, gcCount: 68, gcPauseMs: 22 },
  { id: "s5", timestamp: new Date(), heapUsedMB: 195, heapTotalMB: 256, rssMB: 358, gcCount: 75, gcPauseMs: 25 },
];

const SAMPLE_LEAKS: MemoryLeak[] = [
  { id: "l1", detectedAt: new Date(Date.now() - 1800000), growthRateMBPerHour: 28, severity: "medium", source: "Event listeners not removed in WebSocket handler" },
];

export default function MemoryProfiler({ onClose }: MemoryProfilerProps): React.ReactElement {
  const [snapshots] = useState<Snapshot[]>(SAMPLE_SNAPSHOTS);
  const [leaks] = useState<MemoryLeak[]>(SAMPLE_LEAKS);
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const [tab, setTab] = useState<"timeline" | "leaks" | "gc">("timeline");

  const latest = snapshots[snapshots.length - 1];
  const maxHeap = Math.max(...snapshots.map(s => s.heapTotalMB));

  const toggleSelect = (id: string) => {
    setSelectedSnapshots(prev => prev.includes(id) ? prev.filter(s => s !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Memory Profiler</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Camera size={12} /> Snapshot</Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Download size={12} /> Export</Button>
          {onClose && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X size={14} /></Button>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 px-4 py-3 border-b border-border/30">
        <div className="text-center"><div className="text-[10px] text-muted-foreground">Heap Used</div><div className="text-lg font-bold">{latest.heapUsedMB}MB</div></div>
        <div className="text-center"><div className="text-[10px] text-muted-foreground">Heap Total</div><div className="text-lg font-bold">{latest.heapTotalMB}MB</div></div>
        <div className="text-center"><div className="text-[10px] text-muted-foreground">RSS</div><div className="text-lg font-bold">{latest.rssMB}MB</div></div>
        <div className="text-center"><div className="text-[10px] text-muted-foreground">GC Pause</div><div className="text-lg font-bold">{latest.gcPauseMs}ms</div></div>
      </div>

      <div className="flex items-center gap-1 px-4 py-2 border-b border-border/30">
        {(["timeline", "leaks", "gc"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded text-xs font-medium ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/30"}`}>
            {t === "timeline" ? "Timeline" : t === "leaks" ? `Leaks (${leaks.length})` : "GC Metrics"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === "timeline" && (
          <div className="space-y-2">
            {snapshots.map(snap => {
              const pct = (snap.heapUsedMB / snap.heapTotalMB) * 100;
              const selected = selectedSnapshots.includes(snap.id);
              return (
                <div key={snap.id} onClick={() => toggleSelect(snap.id)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/20"}`}>
                  <span className="text-[10px] text-muted-foreground w-16 shrink-0">{snap.timestamp.toLocaleTimeString()}</span>
                  <div className="flex-1">
                    <div className="h-3 rounded-full overflow-hidden bg-muted/30">
                      <div className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 75 ? "bg-yellow-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-mono w-24 text-right">{snap.heapUsedMB}/{snap.heapTotalMB}MB</span>
                  <span className="text-[10px] text-muted-foreground w-16 text-right">RSS {snap.rssMB}MB</span>
                </div>
              );
            })}
            {selectedSnapshots.length === 2 && (
              <div className="mt-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                <div className="text-xs font-semibold mb-2">Snapshot Comparison</div>
                {(() => {
                  const s1 = snapshots.find(s => s.id === selectedSnapshots[0])!;
                  const s2 = snapshots.find(s => s.id === selectedSnapshots[1])!;
                  const diff = s2.heapUsedMB - s1.heapUsedMB;
                  return (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Heap Δ:</span> <span className={diff > 0 ? "text-red-400" : "text-green-400"}>{diff > 0 ? "+" : ""}{diff}MB</span></div>
                      <div><span className="text-muted-foreground">RSS Δ:</span> <span>{s2.rssMB - s1.rssMB > 0 ? "+" : ""}{s2.rssMB - s1.rssMB}MB</span></div>
                      <div><span className="text-muted-foreground">GC Δ:</span> <span>{s2.gcCount - s1.gcCount} cycles</span></div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
        {tab === "leaks" && (
          <div className="space-y-2">
            {leaks.length === 0 ? <div className="text-center text-xs text-muted-foreground py-4">No memory leaks detected</div> : leaks.map(leak => (
              <div key={leak.id} className="p-3 rounded-lg border border-border/30 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className={leak.severity === "high" ? "text-red-400" : leak.severity === "medium" ? "text-yellow-400" : "text-blue-400"} />
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${leak.severity === "high" ? "bg-red-400/10 text-red-400" : leak.severity === "medium" ? "bg-yellow-400/10 text-yellow-400" : "bg-blue-400/10 text-blue-400"}`}>{leak.severity}</span>
                  <span className="text-xs font-medium">+{leak.growthRateMBPerHour} MB/hr</span>
                </div>
                <p className="text-xs text-muted-foreground">{leak.source}</p>
                <p className="text-[10px] text-muted-foreground">Detected {leak.detectedAt.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
        {tab === "gc" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/20 text-center">
                <div className="text-[10px] text-muted-foreground">Total GCs</div>
                <div className="text-lg font-bold">{latest.gcCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 text-center">
                <div className="text-[10px] text-muted-foreground">Avg Pause</div>
                <div className="text-lg font-bold">{(snapshots.reduce((s, sn) => s + sn.gcPauseMs, 0) / snapshots.length).toFixed(1)}ms</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 text-center">
                <div className="text-[10px] text-muted-foreground">Max Pause</div>
                <div className="text-lg font-bold">{Math.max(...snapshots.map(s => s.gcPauseMs))}ms</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">GC Pause History</div>
              {snapshots.map(snap => (
                <div key={snap.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-16">{snap.timestamp.toLocaleTimeString()}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted/20">
                    <div className={`h-full rounded-full ${snap.gcPauseMs > 20 ? "bg-red-500" : snap.gcPauseMs > 15 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${(snap.gcPauseMs / 30) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-mono w-10 text-right">{snap.gcPauseMs}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
