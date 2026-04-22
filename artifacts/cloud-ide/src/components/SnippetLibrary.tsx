import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Code2, Search, Star, Plus, Trash2, Copy, Check, Globe,
  Lock, Tag, Filter, Loader2, ChevronDown, X, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface Snippet {
  id: string;
  title: string;
  description: string;
  language: string;
  code: string;
  tags: string[];
  isPublic: boolean;
  starred: boolean;
  starCount: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

const LANGUAGES = ["typescript", "javascript", "python", "go", "rust", "sql", "css", "html", "java", "plaintext"];

const LANG_COLORS: Record<string, string> = {
  typescript: "bg-blue-500", javascript: "bg-yellow-500", python: "bg-green-500",
  go: "bg-cyan-500", rust: "bg-orange-500", sql: "bg-purple-500",
  css: "bg-pink-500", html: "bg-red-500", java: "bg-amber-700", plaintext: "bg-gray-500",
};

interface SnippetLibraryProps {
  onInsert?: (code: string) => void;
  compact?: boolean;
}

export default function SnippetLibrary({ onInsert, compact = false }: SnippetLibraryProps) {
  const { toast } = useToast();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState<string | null>(null);
  const [showStarred, setShowStarred] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLang, setNewLang] = useState("typescript");
  const [newCode, setNewCode] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newPublic, setNewPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (langFilter) params.set("language", langFilter);
      if (showStarred) params.set("starred", "true");
      const res = await fetch(`${API_BASE}/api/snippets?${params}`, { credentials: "include" });
      if (res.ok) setSnippets(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  }, [search, langFilter, showStarred]);

  useEffect(() => { fetchSnippets(); }, [fetchSnippets]);

  const handleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/snippets/${id}/star`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSnippets((prev) => prev.map((s) => s.id === id ? { ...s, starred: data.starred, starCount: data.starCount } : s));
      }
    } catch {}
  };

  const handleCopy = (id: string, code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleInsert = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onInsert?.(code);
    toast({ title: "Snippet inserted" });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/snippets/${id}`, { method: "DELETE", credentials: "include" });
      setSnippets((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast({ title: "Snippet deleted" });
    } catch {}
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newCode.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/snippets`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(), description: newDesc.trim(), language: newLang,
          code: newCode, tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
          isPublic: newPublic,
        }),
      });
      if (res.ok) {
        const snippet = await res.json();
        setSnippets((prev) => [snippet, ...prev]);
        setShowCreate(false);
        setNewTitle(""); setNewDesc(""); setNewCode(""); setNewTags("");
        toast({ title: "Snippet saved" });
      }
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selected = useMemo(() => snippets.find((s) => s.id === selectedId), [snippets, selectedId]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    snippets.forEach((s) => s.tags.forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [snippets]);

  return (
    <div className={`flex ${compact ? "flex-col h-full" : "h-full"} bg-[hsl(222,47%,11%)] text-sm`} data-testid="snippet-library">
      <div className={`${compact ? "w-full" : "w-72"} border-r border-border/30 flex flex-col shrink-0`}>
        <div className="px-3 py-2 border-b border-border/30 bg-[hsl(222,47%,13%)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Snippets</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCreate(!showCreate)} data-testid="button-new-snippet">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search snippets..."
              className="h-7 text-xs pl-7"
              data-testid="search-snippets"
            />
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">
                  <Filter className="w-3 h-3 mr-1" />
                  {langFilter || "Language"}
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setLangFilter(null)}>All Languages</DropdownMenuItem>
                <DropdownMenuSeparator />
                {LANGUAGES.map((l) => (
                  <DropdownMenuItem key={l} onClick={() => setLangFilter(l)}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${LANG_COLORS[l] || "bg-gray-500"}`} />
                    {l}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost" size="sm"
              className={`h-6 text-[10px] px-2 ${showStarred ? "text-yellow-400" : ""}`}
              onClick={() => setShowStarred(!showStarred)}
              data-testid="button-starred"
            >
              <Star className={`w-3 h-3 mr-1 ${showStarred ? "fill-yellow-400" : ""}`} />
              Starred
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : snippets.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground/50">No snippets found</div>
          ) : (
            snippets.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                className={`w-full text-left px-3 py-2 border-b border-border/10 hover:bg-white/5 transition-colors ${
                  selectedId === s.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                }`}
                data-testid={`snippet-${s.id}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${LANG_COLORS[s.language] || "bg-gray-500"}`} />
                  <span className="text-xs font-medium truncate flex-1">{s.title}</span>
                  <button onClick={(e) => handleStar(s.id, e)} className="shrink-0">
                    <Star className={`w-3 h-3 ${s.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5 ml-4">{s.description}</p>
                <div className="flex items-center gap-2 mt-1 ml-4">
                  <span className="text-[10px] text-muted-foreground/40">{s.language}</span>
                  {s.isPublic ? <Globe className="w-2.5 h-2.5 text-muted-foreground/30" /> : <Lock className="w-2.5 h-2.5 text-muted-foreground/30" />}
                  <span className="text-[10px] text-muted-foreground/30 flex items-center gap-0.5">
                    <Star className="w-2 h-2" /> {s.starCount}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {!compact && (
        <div className="flex-1 flex flex-col min-w-0">
          {showCreate ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="create-snippet-form">
              <h3 className="text-sm font-medium">New Snippet</h3>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" className="h-8 text-xs" data-testid="input-title" />
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" className="h-8 text-xs" />
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <span className={`w-2 h-2 rounded-full mr-2 ${LANG_COLORS[newLang]}`} />
                      {newLang}
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {LANGUAGES.map((l) => (
                      <DropdownMenuItem key={l} onClick={() => setNewLang(l)}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${LANG_COLORS[l]}`} /> {l}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setNewPublic(!newPublic)}>
                  {newPublic ? <><Globe className="w-3 h-3 mr-1" /> Public</> : <><Lock className="w-3 h-3 mr-1" /> Private</>}
                </Button>
              </div>
              <textarea
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Paste your code here..."
                className="w-full h-48 bg-[hsl(222,47%,9%)] border border-border/30 rounded-md px-3 py-2 font-mono text-xs text-foreground resize-none outline-none focus:border-primary/50"
                spellCheck={false}
                data-testid="input-code"
              />
              <Input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="Tags (comma-separated)" className="h-8 text-xs" />
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs" onClick={handleCreate} disabled={saving || !newTitle.trim() || !newCode.trim()} data-testid="button-save-snippet">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                  Save Snippet
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          ) : selected ? (
            <div className="flex-1 flex flex-col overflow-hidden" data-testid="snippet-detail">
              <div className="px-4 py-3 border-b border-border/30 bg-[hsl(222,47%,13%)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">{selected.title}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{selected.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {onInsert && (
                      <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={(e) => handleInsert(selected.code, e)} data-testid="button-insert">
                        <Code2 className="w-3 h-3 mr-1" /> Insert
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleCopy(selected.id, selected.code, e)}>
                      {copiedId === selected.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={(e) => handleDelete(selected.id, e)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium bg-opacity-20 ${LANG_COLORS[selected.language]} text-white`}>
                    {selected.language}
                  </span>
                  {selected.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-muted-foreground/10 text-muted-foreground flex items-center gap-0.5">
                      <Tag className="w-2 h-2" /> {tag}
                    </span>
                  ))}
                  <span className="text-[10px] text-muted-foreground/40 ml-auto">
                    by {selected.authorName} · {new Date(selected.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-[hsl(222,47%,9%)] p-4">
                <pre className="font-mono text-xs whitespace-pre-wrap text-foreground/90">{selected.code}</pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/40">
              <Code2 className="w-10 h-10 mb-3" />
              <p className="text-xs">Select a snippet to view</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
