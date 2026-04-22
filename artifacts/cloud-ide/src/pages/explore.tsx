import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useExploreProjects, useForkProject } from "@workspace/api-client-react";
import {
  Code2, Search, GitFork, Flame, Sparkles, Star, Users as UsersIcon, Tag, Award,
} from "lucide-react";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

const languages = ["all", "javascript", "typescript", "python", "html", "go", "rust", "java"];
const frameworks = ["all", "react", "next", "vue", "express", "fastapi", "rails"];

type Trending = { id: string; name: string; slug: string; description: string | null; language: string; owner_name: string | null; stars: number };

export default function ExplorePage() {
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");
  const [framework, setFramework] = useState("all");
  const [trendingWindow, setTrendingWindow] = useState<"day" | "week" | "month">("week");
  const [trending, setTrending] = useState<Trending[]>([]);
  const [topUsers, setTopUsers] = useState<{ id: string; username: string; displayName: string | null; projects: number }[]>([]);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const { toast } = useToast();

  const { data, isLoading } = useExploreProjects({
    search: search || undefined,
    language: language === "all" ? undefined : language,
    limit: 24,
  });

  const forkProject = useForkProject();
  const handleFork = (id: string) => {
    forkProject.mutate({ id }, {
      onSuccess: () => toast({ title: "Project forked" }),
      onError: () => toast({ title: "Fork failed", variant: "destructive" }),
    });
  };

  useEffect(() => {
    fetch(`${API}/explore/trending?window=${trendingWindow}&limit=6`)
      .then((r) => r.json())
      .then((d) => setTrending(d.projects || []))
      .catch(() => setTrending([]));
  }, [trendingWindow]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/explore/top-users?limit=8`).then((r) => r.json()).catch(() => ({ users: [] })),
      fetch(`${API}/explore/tags?limit=20`).then((r) => r.json()).catch(() => ({ tags: [] })),
    ]).then(([u, t]) => {
      setTopUsers(u.users || []);
      setTags(t.tags || []);
    });
  }, []);

  const newest = data?.projects?.slice(0, 6) || [];
  const filteredProjects = (data?.projects || []).filter((p) => {
    if (framework === "all") return true;
    const haystack = `${p.name} ${p.description || ""} ${(p as any).framework || ""}`.toLowerCase();
    return haystack.includes(framework);
  });

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="explore-page">
      <MarketingHeader />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Explore the community</h1>
          <p className="text-muted-foreground mt-1">Trending projects, featured templates, and the people building them.</p>
        </div>

        <section className="mb-10" data-testid="explore-trending">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> Trending</h2>
            <div className="flex items-center gap-1 bg-muted/30 rounded-md p-0.5">
              {(["day", "week", "month"] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setTrendingWindow(w)}
                  className={`px-3 py-1 text-xs font-medium rounded ${trendingWindow === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  data-testid={`trending-window-${w}`}
                >{w}</button>
              ))}
            </div>
          </div>
          {trending.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">No trending projects in this window yet.</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trending.map((p) => (
                <Card key={p.id} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <Link href={`/project/${p.id}`} className="font-semibold text-sm hover:text-primary">{p.name}</Link>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description || "No description"}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-muted">{p.language}</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {p.stars}</span>
                      {p.owner_name && <span>by {p.owner_name}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2" data-testid="explore-new">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-3"><Sparkles className="w-5 h-5 text-blue-400" /> New projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {newest.map((p) => (
                <Card key={p.id} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <Link href={`/project/${p.id}`} className="font-semibold text-sm hover:text-primary">{p.name}</Link>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{p.description || p.language}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div data-testid="explore-top-users">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-3"><UsersIcon className="w-5 h-5 text-emerald-400" /> Top users</h2>
            <Card>
              <CardContent className="p-3 space-y-2">
                {topUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 text-center">No users yet.</p>
                ) : topUsers.map((u, i) => (
                  <Link key={u.id} href={`/profile/${u.username}`}>
                    <div className="flex items-center gap-3 p-2 rounded hover:bg-muted/40 cursor-pointer">
                      <span className="text-xs font-mono text-muted-foreground w-5">#{i + 1}</span>
                      <Avatar className="w-7 h-7"><AvatarFallback className="text-xs">{(u.displayName || u.username)[0]?.toUpperCase()}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{u.displayName || u.username}</div>
                        <div className="text-[11px] text-muted-foreground">@{u.username}</div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{u.projects}</Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mb-10" data-testid="explore-templates">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Award className="w-5 h-5 text-purple-400" /> Popular templates</h2>
            <Link href="/templates"><Button variant="ghost" size="sm">View all</Button></Link>
          </div>
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Browse curated starter templates for React, Next, Express, FastAPI, and more in the <Link href="/templates" className="text-primary hover:underline">template store</Link>.
            </CardContent>
          </Card>
        </section>

        <section className="mb-10" data-testid="explore-tags">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-3"><Tag className="w-5 h-5 text-pink-400" /> Topics</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t.tag}
                onClick={() => { setLanguage(t.tag); setSearch(""); }}
                className="px-3 py-1.5 rounded-full bg-muted/40 hover:bg-primary/15 hover:text-primary text-xs font-medium transition-colors"
                style={{ fontSize: `${Math.min(0.85 + Math.log(t.count + 1) * 0.06, 1.2)}rem` }}
                data-testid={`tag-${t.tag}`}
              >{t.tag} <span className="opacity-50 text-[10px]">{t.count}</span></button>
            ))}
            {tags.length === 0 && <p className="text-sm text-muted-foreground">No topics yet.</p>}
          </div>
        </section>

        <section data-testid="explore-all">
          <h2 className="text-xl font-semibold mb-3">All projects</h2>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects..." className="pl-9" data-testid="input-search" />
            </div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-40" data-testid="select-filter-language"><SelectValue /></SelectTrigger>
              <SelectContent>
                {languages.map((l) => <SelectItem key={l} value={l}>{l === "all" ? "All languages" : l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={framework} onValueChange={setFramework}>
              <SelectTrigger className="w-40" data-testid="select-filter-framework"><SelectValue /></SelectTrigger>
              <SelectContent>
                {frameworks.map((f) => <SelectItem key={f} value={f}>{f === "all" ? "All frameworks" : f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse"><CardContent className="p-5 h-32" /></Card>
              ))}
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((p) => (
                <Card key={p.id} className="hover:border-primary/30 transition-colors" data-testid={`explore-project-${p.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-primary" />
                        <Link href={`/project/${p.id}`} className="font-medium text-sm hover:text-primary">{p.name}</Link>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleFork(p.id)} disabled={forkProject.isPending} data-testid={`button-fork-${p.id}`}>
                        <GitFork className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded bg-muted capitalize">{p.language}</span>
                      {p.ownerName && <span>by {p.ownerName}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Code2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No projects found</p>
            </div>
          )}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
