import { useState, useEffect } from "react";
import { X, Bell, Eye, EyeOff, Plus, Trash2, Loader2, FileText, Check, Circle } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

export function FileNotifications({ projectId, onClose }: Props) {
  const [tab, setTab] = useState<"notifications" | "watches">("notifications");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [watches, setWatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPath, setNewPath] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [nRes, wRes] = await Promise.all([
          fetch(`${API}/projects/${projectId}/file-notifications`, { credentials: "include" }),
          fetch(`${API}/projects/${projectId}/file-watches`, { credentials: "include" }),
        ]);
        if (nRes.ok) setNotifications(await nRes.json());
        if (wRes.ok) setWatches(await wRes.json());
      } catch {} finally { setLoading(false); }
    })();
  }, [projectId]);

  const addWatch = async () => {
    if (!newPath.trim()) return;
    try {
      const res = await fetch(`${API}/projects/${projectId}/file-watches`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filePath: newPath.trim() }) });
      if (res.ok) { const w = await res.json(); setWatches([...watches, w]); setNewPath(""); }
    } catch {}
  };

  const removeWatch = async (watchId: string) => {
    try {
      await fetch(`${API}/projects/${projectId}/file-watches/${watchId}`, { method: "DELETE", credentials: "include" });
      setWatches(watches.filter(w => w.id !== watchId));
    } catch {}
  };

  const markRead = async (notifId: string) => {
    try {
      await fetch(`${API}/projects/${projectId}/file-notifications/${notifId}/read`, { method: "PATCH", credentials: "include" });
      setNotifications(notifications.map(n => n.id === notifId ? { ...n, read: true } : n));
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const timeAgo = (ts: string) => { const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000); if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`; };
  const changeColor = (t: string) => t === "created" ? "text-green-400" : t === "deleted" ? "text-red-400" : t === "renamed" ? "text-blue-400" : "text-yellow-400";

  return (
    <div className="h-full flex flex-col bg-background" data-testid="file-notifications">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">File Notifications</span>
          {unreadCount > 0 && <span className="text-[9px] bg-primary text-primary-foreground rounded-full px-1.5">{unreadCount}</span>}
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        <button onClick={() => setTab("notifications")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "notifications" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Notifications</button>
        <button onClick={() => setTab("watches")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "watches" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Watch List ({watches.length})</button>
      </div>
      {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {tab === "notifications" && (notifications.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">No notifications</div>
          ) : notifications.map(n => (
            <div key={n.id} className={`flex items-start gap-2 rounded-lg border p-2 ${n.read ? "border-border/20 bg-card/30" : "border-primary/20 bg-primary/5"}`}>
              {n.read ? <Check className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" /> : <Circle className="w-3 h-3 text-primary fill-primary mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono truncate">{n.filePath}</span>
                  <span className={`text-[8px] px-1 rounded ${changeColor(n.changeType)} bg-current/10`}>{n.changeType}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{n.summary}</div>
                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                  <span>by {n.changedBy}</span>
                  <span>{timeAgo(n.timestamp)} ago</span>
                  <span className="text-green-400">+{n.linesAdded}</span>
                  <span className="text-red-400">-{n.linesRemoved}</span>
                </div>
              </div>
              {!n.read && <button onClick={() => markRead(n.id)} className="p-0.5 hover:bg-muted rounded shrink-0" title="Mark read"><Check className="w-3 h-3" /></button>}
            </div>
          )))}

          {tab === "watches" && (
            <>
              <div className="flex gap-1.5 mb-2">
                <input value={newPath} onChange={e => setNewPath(e.target.value)} onKeyDown={e => e.key === "Enter" && addWatch()} placeholder="File path to watch..." className="flex-1 bg-muted/50 px-2 py-1 text-xs rounded outline-none border border-border/30 focus:border-primary/50 font-mono" />
                <button onClick={addWatch} disabled={!newPath.trim()} className="px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] hover:bg-primary/90 disabled:opacity-50"><Plus className="w-3 h-3" /></button>
              </div>
              {watches.map(w => (
                <div key={w.id} className="flex items-center gap-2 bg-card/50 rounded border border-border/30 p-2 group">
                  <Eye className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-[10px] font-mono flex-1 truncate">{w.filePath}</span>
                  <span className="text-[9px] text-muted-foreground">{timeAgo(w.addedAt)} ago</span>
                  <button onClick={() => removeWatch(w.id)} className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100"><Trash2 className="w-2.5 h-2.5 text-red-400" /></button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
