import { useState, useEffect } from "react";
import { X, MessageSquare, Loader2, Send, Trash2, Eye, EyeOff, Plus, ChevronDown, ChevronRight } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; filePath?: string; onClose: () => void; }

const COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];

function timeAgo(ts: string): string {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AnnotationLayer({ projectId, filePath, onClose }: Props) {
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "shared" | "private">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newAnn, setNewAnn] = useState({ line: 1, text: "", shared: true, color: COLORS[0] });

  useEffect(() => { load(); }, [filePath]);
  const load = async () => {
    setLoading(true);
    try {
      const q = filePath ? `?file=${encodeURIComponent(filePath)}` : "";
      const r = await fetch(`${API}/projects/${projectId}/annotations${q}`, { credentials: "include" });
      if (r.ok) setAnnotations(await r.json());
    } catch {} finally { setLoading(false); }
  };

  const toggle = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const addAnnotation = async () => {
    if (!newAnn.text.trim()) return;
    try {
      await fetch(`${API}/projects/${projectId}/annotations`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: filePath || "src/index.ts", ...newAnn }), credentials: "include",
      });
      setNewAnn({ line: 1, text: "", shared: true, color: COLORS[0] }); setShowAdd(false); load();
    } catch {}
  };

  const reply = async (annId: string) => {
    const text = replyText[annId];
    if (!text?.trim()) return;
    try {
      await fetch(`${API}/projects/${projectId}/annotations/${annId}/reply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }), credentials: "include",
      });
      setReplyText(r => ({ ...r, [annId]: "" })); load();
    } catch {}
  };

  const deleteAnn = async (id: string) => {
    try { await fetch(`${API}/projects/${projectId}/annotations/${id}`, { method: "DELETE", credentials: "include" }); load(); } catch {}
  };

  const filtered = annotations.filter(a => filter === "all" || (filter === "shared" ? a.shared : !a.shared));

  return (
    <div className="h-full flex flex-col bg-background" data-testid="annotation-layer">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Annotations</span>
          <span className="text-[9px] text-muted-foreground">{annotations.length} total</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowAdd(v => !v)} className="p-0.5 hover:bg-muted rounded"><Plus className="w-3.5 h-3.5" /></button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        {(["all", "shared", "private"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-2 py-0.5 text-[9px] rounded capitalize ${filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>{f}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {showAdd && (
          <div className="bg-card/50 rounded-lg border border-primary/30 p-2.5 space-y-2">
            <div className="flex gap-2">
              <input type="number" value={newAnn.line} onChange={e => setNewAnn(n => ({ ...n, line: parseInt(e.target.value) || 1 }))} className="w-16 px-2 py-1 text-[10px] bg-muted/30 border border-border/30 rounded" placeholder="Line" />
              <div className="flex gap-1 items-center">
                {COLORS.map(c => <button key={c} onClick={() => setNewAnn(n => ({ ...n, color: c }))} className={`w-4 h-4 rounded-full border-2 ${newAnn.color === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />)}
              </div>
              <button onClick={() => setNewAnn(n => ({ ...n, shared: !n.shared }))} className="p-1 hover:bg-muted rounded" title={newAnn.shared ? "Shared" : "Private"}>
                {newAnn.shared ? <Eye className="w-3.5 h-3.5 text-green-400" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            </div>
            <textarea value={newAnn.text} onChange={e => setNewAnn(n => ({ ...n, text: e.target.value }))} placeholder="Write your annotation..." className="w-full px-2 py-1.5 text-[10px] bg-muted/30 border border-border/30 rounded resize-none h-14" />
            <button onClick={addAnnotation} disabled={!newAnn.text.trim()} className="px-3 py-1 text-[10px] bg-primary/10 text-primary rounded hover:bg-primary/20 disabled:opacity-50">Add Annotation</button>
          </div>
        )}
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
          <>
            {filtered.length === 0 && <div className="text-center text-[10px] text-muted-foreground py-4">No annotations</div>}
            {filtered.map(ann => {
              const isOpen = expanded.has(ann.id);
              return (
                <div key={ann.id} className="bg-card/50 rounded-lg border border-border/30" style={{ borderLeftColor: ann.color, borderLeftWidth: 3 }}>
                  <div className="flex items-start gap-2 p-2.5 cursor-pointer" onClick={() => toggle(ann.id)}>
                    {isOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" /> : <ChevronRight className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-mono text-muted-foreground">{ann.filePath}:{ann.line}</span>
                        {!ann.shared && <EyeOff className="w-2.5 h-2.5 text-muted-foreground" />}
                        {ann.replies.length > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-blue-400/10 text-blue-400">{ann.replies.length} replies</span>}
                      </div>
                      <div className="text-[10px]">{ann.text}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[8px] text-muted-foreground">{ann.author}</div>
                      <div className="text-[7px] text-muted-foreground">{timeAgo(ann.createdAt)}</div>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="px-2.5 pb-2.5 border-t border-border/20 space-y-2 pt-2">
                      {ann.replies.map((r: any) => (
                        <div key={r.id} className="flex gap-2 text-[9px] pl-4 border-l-2 border-border/20">
                          <div className="flex-1"><span className="font-medium">{r.author}</span> <span className="text-muted-foreground">{timeAgo(r.createdAt)}</span><div className="mt-0.5">{r.text}</div></div>
                        </div>
                      ))}
                      <div className="flex gap-1 pl-4">
                        <input value={replyText[ann.id] || ""} onChange={e => setReplyText(r => ({ ...r, [ann.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && reply(ann.id)} placeholder="Reply..." className="flex-1 px-2 py-1 text-[9px] bg-muted/30 border border-border/30 rounded" />
                        <button onClick={() => reply(ann.id)} className="p-1 hover:bg-muted rounded"><Send className="w-3 h-3 text-primary" /></button>
                        <button onClick={() => deleteAnn(ann.id)} className="p-1 hover:bg-muted rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
