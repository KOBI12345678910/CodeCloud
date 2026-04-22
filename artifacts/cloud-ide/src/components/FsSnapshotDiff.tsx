import { useState, useEffect } from "react";
import { X, Camera, GitCompare, Plus, Minus, Pencil, RotateCcw, Loader2, HardDrive, FileText, Clock } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; containerId?: string; onClose: () => void; }

interface Snapshot { id: string; label: string; createdAt: string; totalFiles: number; totalSize: number; }
interface DiffResult {
  snapshotA: { id: string; label: string; createdAt: string };
  snapshotB: { id: string; label: string; createdAt: string };
  added: any[];
  modified: { path: string; before: any; after: any; sizeDelta: number }[];
  deleted: any[];
  unchanged: number;
  summary: { totalChanges: number; addedCount: number; modifiedCount: number; deletedCount: number; sizeDelta: number };
}

export function FsSnapshotDiff({ projectId, containerId = "main", onClose }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState("");
  const [selectedB, setSelectedB] = useState("");
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [diffing, setDiffing] = useState(false);
  const [tab, setTab] = useState<"added" | "modified" | "deleted">("modified");
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/projects/${projectId}/containers/${containerId}/snapshots`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data);
        if (data.length >= 2) { setSelectedA(data[data.length - 2].id); setSelectedB(data[data.length - 1].id); }
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchSnapshots(); }, []);

  const runDiff = async () => {
    if (!selectedA || !selectedB) return;
    setDiffing(true);
    try {
      const res = await fetch(`${API}/projects/${projectId}/containers/${containerId}/snapshots/diff?a=${selectedA}&b=${selectedB}`, { credentials: "include" });
      if (res.ok) setDiff(await res.json());
    } catch {} finally { setDiffing(false); }
  };

  const createSnap = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${API}/projects/${projectId}/containers/${containerId}/snapshots`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: newLabel || "Manual snapshot" }) });
      if (res.ok) { setNewLabel(""); fetchSnapshots(); }
    } catch {} finally { setCreating(false); }
  };

  const restore = async (snapshotId: string, filePath: string) => {
    setRestoring(filePath);
    try {
      await fetch(`${API}/projects/${projectId}/containers/${containerId}/snapshots/${snapshotId}/restore`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filePath }) });
    } catch {} finally { setTimeout(() => setRestoring(null), 1000); }
  };

  const formatSize = (bytes: number) => {
    if (Math.abs(bytes) < 1024) return `${bytes} B`;
    if (Math.abs(bytes) < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="fs-snapshot-diff">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Camera className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Filesystem Snapshot Diff</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground">Snapshot A (before)</label>
                <select value={selectedA} onChange={e => setSelectedA(e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs mt-0.5">
                  {snapshots.map(s => <option key={s.id} value={s.id}>{s.label} — {timeAgo(s.createdAt)}</option>)}
                </select>
              </div>
              <GitCompare className="w-4 h-4 text-muted-foreground mb-1 shrink-0" />
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground">Snapshot B (after)</label>
                <select value={selectedB} onChange={e => setSelectedB(e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs mt-0.5">
                  {snapshots.map(s => <option key={s.id} value={s.id}>{s.label} — {timeAgo(s.createdAt)}</option>)}
                </select>
              </div>
              <button onClick={runDiff} disabled={diffing || !selectedA || !selectedB} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 shrink-0">
                {diffing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Compare"}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)} className="flex-1 bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs" placeholder="Snapshot label..." />
              <button onClick={createSnap} disabled={creating} className="flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-50">
                {creating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Camera className="w-2.5 h-2.5" />} Snapshot
              </button>
            </div>

            {diff && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-card/50 rounded p-2 border border-border/30 text-center">
                    <div className="text-sm font-bold">{diff.summary.totalChanges}</div>
                    <div className="text-[10px] text-muted-foreground">Changes</div>
                  </div>
                  <div className="bg-green-400/5 rounded p-2 border border-green-400/20 text-center">
                    <div className="text-sm font-bold text-green-400">+{diff.summary.addedCount}</div>
                    <div className="text-[10px] text-muted-foreground">Added</div>
                  </div>
                  <div className="bg-yellow-400/5 rounded p-2 border border-yellow-400/20 text-center">
                    <div className="text-sm font-bold text-yellow-400">~{diff.summary.modifiedCount}</div>
                    <div className="text-[10px] text-muted-foreground">Modified</div>
                  </div>
                  <div className="bg-red-400/5 rounded p-2 border border-red-400/20 text-center">
                    <div className="text-sm font-bold text-red-400">-{diff.summary.deletedCount}</div>
                    <div className="text-[10px] text-muted-foreground">Deleted</div>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground">
                  Size delta: <span className={diff.summary.sizeDelta >= 0 ? "text-green-400" : "text-red-400"}>{diff.summary.sizeDelta >= 0 ? "+" : ""}{formatSize(diff.summary.sizeDelta)}</span> | {diff.unchanged} unchanged files
                </div>

                <div className="flex border-b border-border/30">
                  {([["added", diff.added.length], ["modified", diff.modified.length], ["deleted", diff.deleted.length]] as const).map(([t, c]) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 text-[11px] capitalize border-b-2 ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                      {t} ({c})
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  {tab === "added" && diff.added.map(f => (
                    <div key={f.path} className="flex items-center gap-2 bg-green-400/5 rounded p-1.5 border border-green-400/10 text-xs">
                      <Plus className="w-3 h-3 text-green-400 shrink-0" />
                      <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="flex-1 font-mono text-[10px] truncate">{f.path}</span>
                      <span className="text-[10px] text-muted-foreground">{formatSize(f.size)}</span>
                    </div>
                  ))}
                  {tab === "modified" && diff.modified.map(m => (
                    <div key={m.path} className="flex items-center gap-2 bg-yellow-400/5 rounded p-1.5 border border-yellow-400/10 text-xs">
                      <Pencil className="w-3 h-3 text-yellow-400 shrink-0" />
                      <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="flex-1 font-mono text-[10px] truncate">{m.path}</span>
                      <span className={`text-[10px] ${m.sizeDelta >= 0 ? "text-green-400" : "text-red-400"}`}>{m.sizeDelta >= 0 ? "+" : ""}{formatSize(m.sizeDelta)}</span>
                      <button onClick={() => restore(diff.snapshotA.id, m.path)} disabled={restoring === m.path} className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] border border-border/50 rounded hover:bg-muted disabled:opacity-50">
                        {restoring === m.path ? <Loader2 className="w-2 h-2 animate-spin" /> : <RotateCcw className="w-2 h-2" />} Restore
                      </button>
                    </div>
                  ))}
                  {tab === "deleted" && diff.deleted.map(f => (
                    <div key={f.path} className="flex items-center gap-2 bg-red-400/5 rounded p-1.5 border border-red-400/10 text-xs">
                      <Minus className="w-3 h-3 text-red-400 shrink-0" />
                      <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="flex-1 font-mono text-[10px] truncate">{f.path}</span>
                      <span className="text-[10px] text-muted-foreground">{formatSize(f.size)}</span>
                      <button onClick={() => restore(diff.snapshotA.id, f.path)} disabled={restoring === f.path} className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] border border-border/50 rounded hover:bg-muted disabled:opacity-50">
                        {restoring === f.path ? <Loader2 className="w-2 h-2 animate-spin" /> : <RotateCcw className="w-2 h-2" />} Restore
                      </button>
                    </div>
                  ))}
                  {((tab === "added" && diff.added.length === 0) || (tab === "modified" && diff.modified.length === 0) || (tab === "deleted" && diff.deleted.length === 0)) && (
                    <div className="text-[10px] text-muted-foreground text-center py-4">No {tab} files</div>
                  )}
                </div>
              </>
            )}

            {!diff && !loading && (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <HardDrive className="w-6 h-6 mb-2 opacity-30" />
                <div className="text-xs">Select two snapshots and click Compare</div>
                <div className="text-[10px] mt-1">{snapshots.length} snapshots available</div>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Snapshot History</div>
              {snapshots.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-card/50 rounded p-1.5 border border-border/30 text-xs">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{s.label}</span>
                  <span className="text-[10px] text-muted-foreground">{s.totalFiles} files</span>
                  <span className="text-[10px] text-muted-foreground">{formatSize(s.totalSize)}</span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(s.createdAt)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
