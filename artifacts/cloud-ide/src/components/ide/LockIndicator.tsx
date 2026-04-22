import { useState, useEffect } from "react";
import { Lock, Unlock, Loader2, X } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Props { projectId: string; onClose: () => void; }

export function LockIndicator({ projectId, onClose }: Props) {
  const [locks, setLocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const res = await fetch(`${API}/projects/${projectId}/locks`, { credentials: "include" }); if (res.ok) setLocks(await res.json()); } catch {} finally { setLoading(false); }
    })();
  }, [projectId]);

  const timeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const mins = Math.floor(diff / 60000);
    return `${mins}m remaining`;
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="lock-indicator">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">File Locks</span><span className="text-[10px] text-muted-foreground">({locks.length})</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : locks.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">No locked files</div>
        ) : locks.map(lock => (
          <div key={lock.id} className="flex items-center gap-2 bg-card/50 rounded border border-border/30 px-2 py-1.5">
            <Lock className="w-3 h-3 text-yellow-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono truncate">{lock.filePath}</div>
              <div className="text-[9px] text-muted-foreground">by {lock.lockedBy} · {timeRemaining(lock.expiresAt)}</div>
            </div>
            {lock.reason && <span className="text-[9px] text-muted-foreground italic truncate max-w-24">{lock.reason}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
