import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Folder, Clock, Star, ArrowRight, Command, Hash } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Project {
  id: string;
  name: string;
  language?: string;
  description?: string;
  lastAccessedAt?: string;
  updatedAt?: string;
  isStarred?: boolean;
  containerStatus?: string;
}

function fuzzyMatch(text: string, query: string): { match: boolean; score: number } {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();

  if (lower === q) return { match: true, score: 100 };
  if (lower.startsWith(q)) return { match: true, score: 90 };
  if (lower.includes(q)) return { match: true, score: 70 };

  let qi = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  let lastMatchIdx = -2;

  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) {
      consecutive = i === lastMatchIdx + 1 ? consecutive + 1 : 1;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
      lastMatchIdx = i;
      qi++;
    }
  }

  if (qi < q.length) return { match: false, score: 0 };
  const score = 30 + (maxConsecutive / q.length) * 30 + (q.length / lower.length) * 10;
  return { match: true, score };
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx >= 0) {
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-blue-400 font-semibold">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  }

  const parts: React.ReactNode[] = [];
  let qi = 0;
  for (let i = 0; i < text.length; i++) {
    if (qi < q.length && text[i].toLowerCase() === q[qi]) {
      parts.push(<span key={i} className="text-blue-400 font-semibold">{text[i]}</span>);
      qi++;
    } else {
      parts.push(text[i]);
    }
  }
  return <>{parts}</>;
}

function langColor(lang?: string): string {
  const colors: Record<string, string> = {
    javascript: "#f7df1e",
    typescript: "#3178c6",
    python: "#3572A5",
    rust: "#dea584",
    go: "#00ADD8",
    java: "#b07219",
    ruby: "#701516",
    cpp: "#f34b7d",
    html: "#e34c26",
    css: "#563d7c",
  };
  return colors[(lang || "").toLowerCase()] || "#6b7280";
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function ProjectSwitcher() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["switcher-projects"],
    queryFn: async () => {
      const res = await fetch(`${API}/projects`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
    staleTime: 10000,
  });

  const filtered = useMemo(() => {
    let items = [...projects];

    if (query.trim()) {
      items = items
        .map(p => ({ project: p, ...fuzzyMatch(p.name, query.trim()) }))
        .filter(r => r.match)
        .sort((a, b) => b.score - a.score)
        .map(r => r.project);
    } else {
      items.sort((a, b) => {
        if (a.isStarred && !b.isStarred) return -1;
        if (!a.isStarred && b.isStarred) return 1;
        const aTime = new Date(a.lastAccessedAt || a.updatedAt || 0).getTime();
        const bTime = new Date(b.lastAccessedAt || b.updatedAt || 0).getTime();
        return bTime - aTime;
      });
    }

    return items;
  }, [projects, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filtered.length]);

  const openSwitcher = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const closeSwitcher = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const navigateToProject = useCallback((project: Project) => {
    setLocation(`/project/${project.id}`);
    closeSwitcher();
  }, [setLocation, closeSwitcher]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        if (open) closeSwitcher();
        else openSwitcher();
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        closeSwitcher();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, openSwitcher, closeSwitcher]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(filtered.length - 1, prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) navigateToProject(filtered[selectedIndex]);
    }
  }, [filtered, selectedIndex, navigateToProject]);

  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.children[selectedIndex] as HTMLElement;
    if (selected) selected.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" data-testid="project-switcher">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSwitcher} />
      <div className="relative w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Folder className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {query ? "No projects match your search" : "No projects found"}
              </p>
              {query && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Try a different search term
                </p>
              )}
            </div>
          ) : (
            filtered.map((project, i) => (
              <button
                key={project.id}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group ${
                  i === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => navigateToProject(project)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
                  style={{ backgroundColor: langColor(project.language) + "20", color: langColor(project.language) }}
                >
                  {project.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {highlightMatch(project.name, query)}
                    </span>
                    {project.isStarred && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                    {project.containerStatus === "running" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {project.language && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor(project.language) }} />
                        {project.language}
                      </span>
                    )}
                    {(project.lastAccessedAt || project.updatedAt) && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(project.lastAccessedAt || project.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className={`w-4 h-4 shrink-0 transition-opacity ${
                  i === selectedIndex ? "opacity-60" : "opacity-0 group-hover:opacity-30"
                }`} />
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-muted/30">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[9px]">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[9px]">↵</kbd> open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[9px]">esc</kbd> close
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">{filtered.length} project{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
