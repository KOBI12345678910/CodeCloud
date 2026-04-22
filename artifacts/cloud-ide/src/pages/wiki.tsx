import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Search, FileText, Edit, Trash2, ChevronRight, Eye, Loader2, History, Globe } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface WikiPage { id: string; title: string; content: string; slug: string; parentId?: string; isPublic: boolean; version: number; createdAt: string; }

export default function WikiPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [, navigate] = useLocation();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [selected, setSelected] = useState<WikiPage | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const fetchPages = useCallback(async () => {
    try { const q = search ? `?q=${encodeURIComponent(search)}` : ""; const res = await fetch(`${API}/projects/${projectId}/wiki${q}`, { credentials: "include" }); if (res.ok) setPages(await res.json()); } catch {} finally { setLoading(false); }
  }, [projectId, search]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const selectPage = async (page: WikiPage) => {
    try { const res = await fetch(`${API}/wiki/${page.id}`, { credentials: "include" }); if (res.ok) { const p = await res.json(); setSelected(p); setEditTitle(p.title); setEditContent(p.content); } } catch {}
  };

  const createPage = async () => {
    if (!newTitle.trim()) return;
    const slug = newTitle.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    try {
      const res = await fetch(`${API}/projects/${projectId}/wiki`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle.trim(), slug, content: "" }) });
      if (res.ok) { const page = await res.json(); setCreating(false); setNewTitle(""); fetchPages(); selectPage(page); setEditing(true); }
    } catch {}
  };

  const savePage = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`${API}/wiki/${selected.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: editTitle, content: editContent }) });
      if (res.ok) { setSelected(await res.json()); setEditing(false); fetchPages(); }
    } catch {}
  };

  const deletePage = async (id: string) => {
    try { await fetch(`${API}/wiki/${id}`, { method: "DELETE", credentials: "include" }); if (selected?.id === id) setSelected(null); fetchPages(); } catch {}
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground" data-testid="wiki-page">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 bg-card/50 shrink-0">
        <button onClick={() => navigate(`/project/${projectId}`)} className="p-1 hover:bg-muted rounded"><ArrowLeft className="w-4 h-4" /></button>
        <FileText className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Project Wiki</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-60 border-r border-border/30 flex flex-col shrink-0">
          <div className="p-2 border-b border-border/30 space-y-1">
            <div className="flex items-center gap-1">
              <Search className="w-3 h-3 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent text-xs outline-none" placeholder="Search pages..." />
            </div>
            <button onClick={() => setCreating(true)} className="flex items-center gap-1 w-full px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"><Plus className="w-3 h-3" /> New Page</button>
          </div>
          {creating && (
            <div className="p-2 border-b border-border/30 space-y-1">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && createPage()} className="w-full bg-muted/50 border border-border/50 rounded px-2 py-1 text-xs" placeholder="Page title..." autoFocus />
              <div className="flex gap-1"><button onClick={createPage} className="flex-1 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded">Create</button><button onClick={() => { setCreating(false); setNewTitle(""); }} className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button></div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div> :
              pages.length === 0 ? <div className="p-4 text-center text-xs text-muted-foreground">No pages yet</div> :
              pages.map(p => (
                <button key={p.id} onClick={() => selectPage(p)} className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-muted/30 group ${selected?.id === p.id ? "bg-muted/50" : ""}`}>
                  <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{p.title}</span>
                  {p.isPublic && <Globe className="w-2.5 h-2.5 text-green-400" />}
                  <button onClick={e => { e.stopPropagation(); deletePage(p.id); }} className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                </button>
              ))
            }
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm"><div className="text-center"><FileText className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>Select or create a wiki page</p></div></div>
          ) : editing ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 shrink-0">
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="flex-1 bg-muted/50 border border-border/50 rounded px-2 py-1 text-sm font-medium" />
                <button onClick={savePage} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded">Save</button>
                <button onClick={() => setEditing(false)} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="flex-1 p-4 text-sm font-mono bg-background resize-none outline-none" placeholder="Write your documentation in Markdown..." />
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 shrink-0">
                <h2 className="flex-1 text-sm font-bold">{selected.title}</h2>
                <span className="text-[10px] text-muted-foreground">v{selected.version}</span>
                <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-muted"><Edit className="w-3 h-3" /> Edit</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {selected.content ? <pre className="whitespace-pre-wrap text-sm font-mono">{selected.content}</pre> : <p className="text-sm text-muted-foreground italic">No content yet. Click Edit to add content.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
