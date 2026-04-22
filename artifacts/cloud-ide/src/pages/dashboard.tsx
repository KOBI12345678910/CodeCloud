import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import {
  useGetDashboardStats,
  useGetRecentActivity,
  useGetLanguageBreakdown,
  useListTemplates,
  useCreateProject,
  useGetProfile,
  getGetDashboardStatsQueryKey,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Code2, Rocket, HardDrive, Container, FolderOpen, Clock,
  LogOut, Settings, Bell, Search, ArrowUpRight, Zap, BookOpen,
  Globe, Terminal, Sparkles, ChevronRight, Star, Lock, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useClerk } from "@clerk/react";
import DashboardWidgets from "@/components/DashboardWidgets";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SkeletonCard() {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4">
        <div className="animate-pulse">
          <div className="h-3 w-16 bg-muted rounded mb-3" />
          <div className="h-7 w-12 bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between p-3">
      <div className="flex items-center gap-3 animate-pulse">
        <div className="w-8 h-8 rounded bg-muted" />
        <div>
          <div className="h-3.5 w-32 bg-muted rounded mb-1.5" />
          <div className="h-2.5 w-16 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

const PLAN_LIMITS = {
  free: { projects: 3, storage: 1073741824, label: "Free", color: "text-muted-foreground" },
  pro: { projects: -1, storage: 21474836480, label: "Pro", color: "text-primary" },
  team: { projects: -1, storage: -1, label: "Team", color: "text-amber-500" },
};

const LANG_COLORS: Record<string, string> = {
  javascript: "bg-yellow-500/20 text-yellow-400",
  typescript: "bg-blue-500/20 text-blue-400",
  python: "bg-green-500/20 text-green-400",
  html: "bg-orange-500/20 text-orange-400",
  go: "bg-cyan-500/20 text-cyan-300",
  rust: "bg-red-500/20 text-red-400",
  java: "bg-red-600/20 text-red-300",
  ruby: "bg-rose-500/20 text-rose-400",
  cpp: "bg-purple-500/20 text-purple-400",
  php: "bg-indigo-500/20 text-indigo-400",
};

function getLangStyle(lang: string) {
  return LANG_COLORS[lang.toLowerCase()] || "bg-primary/10 text-primary";
}

const quickStarts = [
  { icon: Globe, label: "React App", lang: "javascript", desc: "Create a React + Vite app" },
  { icon: Terminal, label: "Node.js API", lang: "javascript", desc: "Build a REST API with Express" },
  { icon: Code2, label: "Python Script", lang: "python", desc: "Start a Python project" },
  { icon: Sparkles, label: "HTML/CSS Site", lang: "html", desc: "Build a static website" },
];

export default function DashboardPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectLang, setProjectLang] = useState("javascript");
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 5 });
  const { data: langBreakdown, isLoading: langLoading } = useGetLanguageBreakdown();
  const { data: templates } = useListTemplates();
  const { data: profile } = useGetProfile();
  const createProject = useCreateProject();

  const userPlan = (profile?.plan as keyof typeof PLAN_LIMITS) || "free";
  const currentPlan = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;
  const projectCount = stats?.totalProjects ?? 0;
  const storageUsed = stats?.storageUsedBytes ?? 0;
  const projectUsagePercent = currentPlan.projects > 0 ? Math.min(100, (projectCount / currentPlan.projects) * 100) : 0;
  const storageUsagePercent = currentPlan.storage > 0 ? Math.min(100, (storageUsed / currentPlan.storage) * 100) : 0;

  const handleCreate = () => {
    if (!projectName.trim()) return;
    createProject.mutate(
      { data: { name: projectName, language: projectLang, templateId: selectedTemplate, isPublic: true } },
      {
        onSuccess: (project) => {
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setCreateOpen(false);
          setProjectName("");
          setLocation(`/project/${project.id}`);
        },
        onError: () => {
          toast({ title: "Failed to create project", variant: "destructive" });
        },
      }
    );
  };

  const handleQuickStart = (lang: string) => {
    setProjectLang(lang);
    setCreateOpen(true);
  };

  const statCards = [
    { label: "Projects", value: stats?.totalProjects ?? 0, icon: FolderOpen, color: "text-primary", limit: currentPlan.projects > 0 ? `/ ${currentPlan.projects}` : "" },
    { label: "Deployments", value: stats?.totalDeployments ?? 0, icon: Rocket, color: "text-emerald-400", limit: "" },
    { label: "Storage", value: formatBytes(stats?.storageUsedBytes ?? 0), icon: HardDrive, color: "text-amber-400", limit: currentPlan.storage > 0 ? `/ ${formatBytes(currentPlan.storage)}` : "" },
    { label: "Active", value: stats?.activeContainers ?? 0, icon: Container, color: "text-cyan-400", limit: "" },
  ];

  const hasProjects = stats?.recentProjects && stats.recentProjects.length > 0;

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-page">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold tracking-tight">CodeCloud</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-foreground" data-testid="nav-dashboard">Dashboard</Button>
              </Link>
              <Link href="/explore">
                <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="nav-explore">Explore</Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="hidden md:inline-flex text-xs gap-1 text-primary">
                <Zap className="w-3 h-3" /> Upgrade
              </Button>
            </Link>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowNotifications(!showNotifications)}
                data-testid="button-notifications"
              >
                <Bell className="w-4 h-4" />
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border/50 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-border/30">
                    <p className="text-sm font-semibold">Notifications</p>
                  </div>
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No new notifications
                  </div>
                </div>
              )}
            </div>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="nav-settings">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => signOut()} data-testid="button-signout">
              <LogOut className="w-4 h-4" />
            </Button>
            {user?.imageUrl && (
              <img src={user.imageUrl} alt="" className="w-7 h-7 rounded-full" />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-welcome">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Here is what is happening with your projects</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-project">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
                <DialogDescription>Set up a new project to start coding.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Project Name</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="my-awesome-project"
                    data-testid="input-project-name"
                  />
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={projectLang} onValueChange={setProjectLang}>
                    <SelectTrigger data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="typescript">TypeScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="html">HTML/CSS</SelectItem>
                      <SelectItem value="go">Go</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {templates && templates.length > 0 && (
                  <div>
                    <Label>Template (optional)</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger data-testid="select-template">
                        <SelectValue placeholder="Blank project" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={!projectName.trim() || createProject.isPending}
                  data-testid="button-create-project"
                >
                  {createProject.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!statsLoading && currentPlan.projects > 0 && projectUsagePercent >= 80 && (
          <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {projectUsagePercent >= 100
                    ? "You've reached your project limit"
                    : `You're using ${projectCount} of ${currentPlan.projects} projects`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upgrade to Pro for unlimited projects, more storage, and dedicated compute.
                </p>
              </div>
            </div>
            <Link href="/pricing">
              <Button size="sm" className="shrink-0">
                Upgrade <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : statCards.map((s) => (
                <Card key={s.label} className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                        <p className="text-2xl font-bold mt-1" data-testid={`stat-${s.label.toLowerCase()}`}>
                          {s.value}
                          {s.limit && <span className="text-sm font-normal text-muted-foreground ml-1">{s.limit}</span>}
                        </p>
                      </div>
                      <s.icon className={`w-8 h-8 ${s.color} opacity-60`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {!statsLoading && !hasProjects && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {quickStarts.map((qs) => (
                <button
                  key={qs.label}
                  onClick={() => handleQuickStart(qs.lang)}
                  className="p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all text-left group"
                >
                  <qs.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                  <p className="font-medium text-sm">{qs.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{qs.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Projects</CardTitle>
                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search projects..."
                      className="h-8 pl-8 text-xs"
                      data-testid="input-search-projects"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
                  </div>
                ) : hasProjects ? (
                  <div className="space-y-1">
                    {stats!.recentProjects!.filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => (
                      <Link key={p.id} href={`/project/${p.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group" data-testid={`project-card-${p.id}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getLangStyle(p.language)}`}>
                              <Code2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{p.name}</p>
                                {p.isPublic ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <Eye className="w-2.5 h-2.5" /> Public
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    <Lock className="w-2.5 h-2.5" /> Private
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground capitalize">{p.language}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {(p as any).starsCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 text-amber-400" />
                                {(p as any).starsCount}
                              </span>
                            )}
                            <span className={`w-2 h-2 rounded-full ${p.containerStatus === "running" ? "bg-emerald-400" : "bg-zinc-500"}`} />
                            <span>{formatDate(p.updatedAt)}</span>
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium">No projects yet</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first project to get started</p>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      <Plus className="w-3 h-3 mr-1" /> Create Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Your Plan</CardTitle>
                  <Link href="/pricing">
                    <Button variant="ghost" size="sm" className="text-xs text-primary h-7">
                      Upgrade <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Projects</span>
                      <span className="font-medium">{projectCount} / {currentPlan.projects}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${projectUsagePercent >= 90 ? "bg-red-500" : projectUsagePercent >= 70 ? "bg-amber-500" : "bg-primary"}`}
                        style={{ width: `${projectUsagePercent}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Storage</span>
                      <span className="font-medium">{formatBytes(storageUsed)} / {formatBytes(currentPlan.storage)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${storageUsagePercent >= 90 ? "bg-red-500" : storageUsagePercent >= 70 ? "bg-amber-500" : "bg-primary"}`}
                        style={{ width: `${storageUsagePercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      You're on the <span className="font-medium text-foreground capitalize">{currentPlan.label}</span> plan.
                      {userPlan === "free" && " Upgrade for unlimited projects and 20x more storage."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Languages</CardTitle>
              </CardHeader>
              <CardContent>
                {langLoading ? (
                  <div className="space-y-3 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="h-3 w-20 bg-muted rounded" />
                        <div className="h-3 w-6 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : langBreakdown && langBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {langBreakdown.map((l) => (
                      <div key={l.language} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{l.language}</span>
                        <span className="text-sm text-muted-foreground">{l.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="space-y-3 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-3.5 h-3.5 bg-muted rounded mt-0.5" />
                        <div>
                          <div className="h-3 w-40 bg-muted rounded mb-1.5" />
                          <div className="h-2.5 w-16 bg-muted rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activity && activity.length > 0 ? (
                  <div className="space-y-3">
                    {activity.map((a) => (
                      <div key={a.id} className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs">{a.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Clock className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No activity yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8">
          <DashboardWidgets onCreateProject={() => setCreateOpen(true)} />
        </div>
      </main>
    </div>
  );
}
