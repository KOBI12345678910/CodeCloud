import { useState, useEffect } from "react";
import { X, FileText, Loader2, RefreshCw, ToggleLeft, ToggleRight, Copy, Check, Eye, Code, ChevronDown, ChevronRight } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const TYPE_COLOR: Record<string, string> = {
  badges: "text-blue-400 bg-blue-400/10",
  install: "text-green-400 bg-green-400/10",
  api: "text-purple-400 bg-purple-400/10",
  usage: "text-yellow-400 bg-yellow-400/10",
  config: "text-cyan-400 bg-cyan-400/10",
  contributing: "text-orange-400 bg-orange-400/10",
};

function timeAgo(ts: string): string {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ReadmeUpdater({ projectId, onClose }: Props) {
  const [sections, setSections] = useState<any[]>([]);
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sections" | "preview">("sections");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [secRes, genRes] = await Promise.all([
        fetch(`${API}/projects/${projectId}/readme/sections`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/projects/${projectId}/readme/generate`, { credentials: "include" }).then(r => r.json()),
      ]);
      setSections(secRes); setMarkdown(genRes.markdown);
    } catch {} finally { setLoading(false); }
  };

  const toggle = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAuto = async (id: string) => {
    try { await fetch(`${API}/projects/${projectId}/readme/sections/${id}/toggle`, { method: "POST", credentials: "include" }); load(); } catch {}
  };

  const refresh = async (id: string) => {
    try { await fetch(`${API}/projects/${projectId}/readme/sections/${id}/refresh`, { method: "POST", credentials: "include" }); load(); } catch {}
  };

  const copyMd = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const autoCount = sections.filter(s => s.autoUpdate).length;

  return (
    <div className="h-full flex flex-col bg-background" data-testid="readme-updater">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">README Updater</span>
          <span className="text-[9px] text-muted-foreground">{autoCount}/{sections.length} auto-updating</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        <button onClick={() => setTab("sections")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "sections" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Sections ({sections.length})</button>
        <button onClick={() => setTab("preview")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "preview" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Preview</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div> : (
          <>
            {tab === "sections" && sections.map(s => {
              const isOpen = expanded.has(s.id);
              return (
                <div key={s.id} className="bg-card/50 rounded-lg border border-border/30">
                  <div className="flex items-center gap-2 p-2.5 cursor-pointer" onClick={() => toggle(s.id)}>
                    {isOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                    <span className="text-[10px] font-medium flex-1">{s.name}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded ${TYPE_COLOR[s.type] || ""}`}>{s.type}</span>
                    <span className="text-[8px] text-muted-foreground">{timeAgo(s.lastUpdated)}</span>
                    <button onClick={e => { e.stopPropagation(); toggleAuto(s.id); }} className="p-0.5 hover:bg-muted rounded" title={s.autoUpdate ? "Disable auto-update" : "Enable auto-update"}>
                      {s.autoUpdate ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); refresh(s.id); }} className="p-0.5 hover:bg-muted rounded" title="Refresh"><RefreshCw className="w-3 h-3 text-muted-foreground hover:text-primary" /></button>
                  </div>
                  {isOpen && (
                    <div className="px-2.5 pb-2.5 border-t border-border/20">
                      <pre className="text-[9px] text-muted-foreground font-mono whitespace-pre-wrap mt-2 max-h-40 overflow-y-auto bg-muted/10 rounded p-2">{s.content}</pre>
                    </div>
                  )}
                </div>
              );
            })}
            {tab === "preview" && (
              <div className="bg-card/50 rounded-lg border border-border/30 p-3">
                <div className="flex justify-end mb-2">
                  <button onClick={copyMd} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-primary/10 text-primary rounded hover:bg-primary/20">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{copied ? "Copied" : "Copy Markdown"}
                  </button>
                </div>
                <pre className="text-[9px] font-mono whitespace-pre-wrap max-h-[600px] overflow-y-auto">{markdown}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
