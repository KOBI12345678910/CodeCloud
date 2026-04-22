import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Code2, FileText, User as UserIcon, Hash, MessageSquare, Sparkles,
  TrendingUp, Clock, Compass, Award, BookOpen,
} from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Hit = { id: string; type: string; title: string; subtitle?: string; url: string };
type Group = { type: string; label: string; hits: Hit[] };

const ICONS: Record<string, any> = {
  project: Code2,
  template: Sparkles,
  user: UserIcon,
  doc: BookOpen,
  post: MessageSquare,
};

const QUICK_LINKS = [
  { label: "Explore", url: "/explore", icon: Compass },
  { label: "Bounties", url: "/bounties", icon: Award },
  { label: "Docs", url: "/docs", icon: BookOpen },
  { label: "Blog", url: "/blog", icon: FileText },
  { label: "Changelog", url: "/changelog", icon: Sparkles },
];

export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<{ query: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const go = useCallback((url: string) => {
    onOpenChange(false);
    setQuery("");
    const stripped = url.startsWith(basePath) ? url.slice(basePath.length) || "/" : url;
    navigate(stripped);
  }, [navigate, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch(`${API}/search/recent`).then((r) => r.json()).catch(() => ({ recent: [] })),
      fetch(`${API}/search/trending`).then((r) => r.json()).catch(() => ({ trending: [] })),
    ]).then(([r, t]) => {
      setRecent(r.recent || []);
      setTrending(t.trending || []);
    });
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setGroups([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/search/global?q=${encodeURIComponent(query)}&limit=6`, { signal: ctrl.signal });
        const data = await res.json();
        setGroups(data.groups || []);
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search projects, templates, users, docs..."
        value={query}
        onValueChange={setQuery}
        data-testid="command-palette-input"
      />
      <CommandList>
        {!query.trim() ? (
          <>
            <CommandGroup heading="Quick links">
              {QUICK_LINKS.map((l) => {
                const Icon = l.icon;
                return (
                  <CommandItem key={l.url} value={`quick-${l.label}`} onSelect={() => go(l.url)} data-testid={`palette-quick-${l.label.toLowerCase()}`}>
                    <Icon className="w-4 h-4 mr-2" />{l.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {recent.length > 0 && (
              <CommandGroup heading="Recent">
                {recent.map((q) => (
                  <CommandItem key={`r-${q}`} value={`recent-${q}`} onSelect={() => setQuery(q)}>
                    <Clock className="w-4 h-4 mr-2 opacity-60" />{q}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {trending.length > 0 && (
              <CommandGroup heading="Trending">
                {trending.map((t) => (
                  <CommandItem key={`t-${t.query}`} value={`trend-${t.query}`} onSelect={() => setQuery(t.query)}>
                    <TrendingUp className="w-4 h-4 mr-2 opacity-60" />{t.query}
                    <span className="ml-auto text-xs text-muted-foreground">{t.count}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {recent.length === 0 && trending.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Type to search projects, templates, users, docs and posts.
              </div>
            )}
          </>
        ) : (
          <>
            {loading && groups.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">Searching...</div>
            )}
            {!loading && groups.length === 0 && (
              <CommandEmpty>No results for "{query}"</CommandEmpty>
            )}
            {groups.map((g) => {
              const Icon = ICONS[g.type] || Hash;
              return (
                <CommandGroup key={g.type} heading={g.label}>
                  {g.hits.map((h) => (
                    <CommandItem
                      key={`${g.type}-${h.id}`}
                      value={`${g.type}-${h.id}-${h.title}`}
                      onSelect={() => go(h.url)}
                      data-testid={`palette-hit-${h.id}`}
                    >
                      <Icon className="w-4 h-4 mr-2 opacity-70" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm">{h.title}</span>
                        {h.subtitle && (
                          <span className="truncate text-[11px] text-muted-foreground">{h.subtitle}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
