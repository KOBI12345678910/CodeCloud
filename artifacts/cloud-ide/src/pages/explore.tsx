import { useState } from "react";
import { Link } from "wouter";
import { Show } from "@clerk/react";
import { useExploreProjects, useForkProject } from "@workspace/api-client-react";
import { Code2, Search, GitFork } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const languages = ["all", "javascript", "typescript", "python", "html", "go"];

export default function ExplorePage() {
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");
  const { toast } = useToast();

  const { data, isLoading } = useExploreProjects({
    search: search || undefined,
    language: language === "all" ? undefined : language,
    limit: 20,
  });

  const forkProject = useForkProject();

  const handleFork = (id: string) => {
    forkProject.mutate(
      { id },
      {
        onSuccess: () => toast({ title: "Project forked" }),
        onError: () => toast({ title: "Fork failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="min-h-screen bg-background" data-testid="explore-page">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold tracking-tight">CodeCloud</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Show when="signed-in">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">Dashboard</Button>
                </Link>
              </Show>
              <Link href="/explore">
                <Button variant="ghost" size="sm" className="text-foreground">Explore</Button>
              </Link>
            </nav>
          </div>
          <Show when="signed-out">
            <Link href="/sign-in">
              <Button size="sm" data-testid="link-signin">Sign In</Button>
            </Link>
          </Show>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Explore Projects</h1>

        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-40" data-testid="select-filter-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((l) => (
                <SelectItem key={l} value={l}>{l === "all" ? "All Languages" : l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-card border-border/50 animate-pulse">
                <CardContent className="p-5 h-32" />
              </Card>
            ))}
          </div>
        ) : data?.projects && data.projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.projects.map((p) => (
              <Card key={p.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors" data-testid={`explore-project-${p.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <Code2 className="w-4 h-4 text-primary" />
                      <Link href={`/project/${p.id}`} className="font-medium text-sm hover:text-primary transition-colors">
                        {p.name}
                      </Link>
                    </div>
                    <Show when="signed-in">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleFork(p.id)}
                        disabled={forkProject.isPending}
                        data-testid={`button-fork-${p.id}`}
                      >
                        <GitFork className="w-3.5 h-3.5" />
                      </Button>
                    </Show>
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded bg-muted capitalize">{p.language}</span>
                    {p.ownerName && <span>by {p.ownerName}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Code2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No projects found</p>
          </div>
        )}

        {data && (
          <p className="text-xs text-muted-foreground text-center mt-6">
            Showing {data.projects.length} of {data.total} projects
          </p>
        )}
      </main>
    </div>
  );
}
