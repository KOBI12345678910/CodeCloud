import { useState, useEffect, useCallback } from "react";
import { X, Search, Trash2, Download, Copy, Check, Loader2, Terminal } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface HistoryEntry { id: string; command: string; output?: string; exitCode?: number; duration?: number; cwd?: string; createdAt: string; }
interface Props { projectId: string; onClose: () => void; }

export function CommandHistory({ projectId, onClose }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try { const q = search ? `?q=${encodeURIComponent(search)}` : ""; const res = await fetch(`${API}/projects/${projectId}/exec-history${q}`, { credentials: "include" }); if (res.ok) setEntries(await res.json()); } catch {} finally { setLoading(false); }
  }, [projectId, search]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const deleteEntry = async (id: string) => { try { await fetch(`${API}/exec-history/${id}`, { method: "DELETE", credentials: "include" }); fetchHistory(); } catch {} };

  const exportScript = async () => {
    try {
      const res = await fetch(`${API}/projects/${projectId}/exec-history/export`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryIds: [] }) });
      if (res.ok) { const { script } = await res.json(); const blob = new Blob([script], { type: "text/x-shellscript" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "history.sh"; a.click(); URL.revokeObjectURL(url); }
    } catch {}
  };

  const copy = (cmd: string, id: string) => { navigator.clipboard.writeText(cmd); setCopied(id); setTimeout(() => setCopied(""), 2000); };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="command-history">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Command History</span><span className="text-[10px] text-muted-foreground">{entries.length}</span></div>
        <div className="flex items-center gap-1">
          <button onClick={exportScript} className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] border border-border rounded hover:bg-muted"><Download className="w-2.5 h-2.5" /> Export</button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 shrink-0">
        <Search className="w-3 h-3 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent text-xs outline-none" placeholder="Search commands (Ctrl+R)..." />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> :
          entries.length === 0 ? <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No command history</div> :
          <div className="divide-y divide-border/20">
            {entries.map(e => (
              <div key={e.id} className="px-3 py-1.5 hover:bg-muted/30 group">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">$</span>
                  <span className="flex-1 font-mono text-xs truncate">{e.command}</span>
                  {e.exitCode !== null && <span className={`text-[10px] font-mono ${e.exitCode === 0 ? "text-green-400" : "text-red-400"}`}>{e.exitCode}</span>}
                  {e.duration && <span className="text-[10px] text-muted-foreground">{e.duration}ms</span>}
                  <button onClick={() => copy(e.command, e.id)} className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100">
                    {copied === e.id ? <Check className="w-2.5 h-2.5 text-green-400" /> : <Copy className="w-2.5 h-2.5" />}
                  </button>
                  <button onClick={() => deleteEntry(e.id)} className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(e.createdAt).toLocaleString()}{e.cwd ? ` · ${e.cwd}` : ""}</div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}
