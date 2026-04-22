import React, { useState, useMemo } from "react";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Search,
  Layout,
  Sparkles,
  Loader2,
  Code2,
  Zap,
  Server,
  Palette,
  Database,
  Globe,
} from "lucide-react";
import {
  useListTemplates,
  useCreateProject,
  getListProjectsQueryKey,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const LANGUAGE_ICON: Record<string, React.ReactNode> = {
  javascript: <Code2 className="w-5 h-5 text-yellow-500" />,
  typescript: <Code2 className="w-5 h-5 text-blue-500" />,
  python: <Code2 className="w-5 h-5 text-green-500" />,
  go: <Server className="w-5 h-5 text-cyan-500" />,
  rust: <Zap className="w-5 h-5 text-orange-600" />,
  ruby: <Code2 className="w-5 h-5 text-red-500" />,
  php: <Code2 className="w-5 h-5 text-indigo-500" />,
  java: <Code2 className="w-5 h-5 text-amber-600" />,
  html: <Globe className="w-5 h-5 text-orange-500" />,
  css: <Palette className="w-5 h-5 text-blue-400" />,
  sql: <Database className="w-5 h-5 text-emerald-500" />,
};

const LANG_ACCENT: Record<string, string> = {
  javascript: "from-yellow-500/20 to-yellow-500/5",
  typescript: "from-blue-500/20 to-blue-500/5",
  python: "from-green-500/20 to-green-500/5",
  go: "from-cyan-500/20 to-cyan-500/5",
  rust: "from-orange-600/20 to-orange-600/5",
  ruby: "from-red-500/20 to-red-500/5",
  php: "from-indigo-500/20 to-indigo-500/5",
  java: "from-amber-600/20 to-amber-600/5",
};

export default function TemplateStorePage(): React.ReactElement {
  const { theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<string>("all");
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useListTemplates();
  const createProject = useCreateProject();

  const languages = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => t.language && set.add(t.language));
    return ["all", ...Array.from(set).sort()];
  }, [templates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (language !== "all" && t.language !== language) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.language ?? "").toLowerCase().includes(q)
      );
    });
  }, [templates, search, language]);

  const handleUseTemplate = (templateId: string, name: string, lang: string) => {
    setCreatingId(templateId);
    const projectName = `${name} ${new Date().toLocaleDateString()}`;
    createProject.mutate(
      { data: { name: projectName, language: lang, templateId, isPublic: false } },
      {
        onSuccess: (project) => {
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast({ title: "Project created", description: `Opening ${project.name}…` });
          setLocation(`/project/${project.id}`);
        },
        onError: (err: Error) => {
          setCreatingId(null);
          toast({
            title: "Failed to create project",
            description: err.message ?? "Please try again",
            variant: "destructive",
          });
        },
      }
    );
  };

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen ${isDark ? "bg-background text-foreground" : "bg-gray-50 text-gray-900"}`}>
      <header className="border-b border-border/50 h-14 flex items-center px-6 gap-4 sticky top-0 z-10 backdrop-blur bg-background/80">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <Layout className="w-5 h-5 text-primary" />
        <h1 className="font-semibold">Template Store</h1>
        <Badge variant="secondary" className="ml-2">
          {templates.length} templates
        </Badge>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Start a project from a template
            </h2>
            <p className="text-sm text-muted-foreground">
              Pre-configured starters with files, run command, and dependencies. One click and you're coding.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name, language, or framework…"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-template-search"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {languages.map((lang) => (
                <Button
                  key={lang}
                  variant={language === lang ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLanguage(lang)}
                  className="capitalize whitespace-nowrap"
                  data-testid={`button-lang-${lang}`}
                >
                  {lang}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading templates…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Layout className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No templates match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template) => {
              const lang = template.language ?? "javascript";
              const accent = LANG_ACCENT[lang] ?? "from-primary/20 to-primary/5";
              const isCreating = creatingId === template.id;
              return (
                <Card
                  key={template.id}
                  className="group relative overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
                  data-testid={`card-template-${template.slug}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {template.iconUrl ? (
                          <img
                            src={template.iconUrl}
                            alt=""
                            className="w-10 h-10 rounded shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                            {LANGUAGE_ICON[lang] ?? <Code2 className="w-5 h-5" />}
                          </div>
                        )}
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{template.name}</CardTitle>
                          <div className="flex gap-1.5 mt-1">
                            <Badge variant="outline" className="text-xs capitalize h-5">
                              {lang}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-xs line-clamp-2 mt-2 min-h-[2rem]">
                      {template.description ?? "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded truncate flex-1">
                        {template.runCommand}
                      </code>
                      <Button
                        size="sm"
                        onClick={() => handleUseTemplate(template.id, template.name, lang)}
                        disabled={isCreating || createProject.isPending}
                        className="shrink-0"
                        data-testid={`button-use-${template.slug}`}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Creating…
                          </>
                        ) : (
                          "Use Template"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
