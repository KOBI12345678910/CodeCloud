import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  FolderOpen, Rocket, HardDrive, Activity, Star, Bell,
  Zap, Code2, Eye, Lock, ChevronRight, GripVertical,
  Plus, Settings, LayoutGrid, RotateCcw, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useGetDashboardStats,
  useGetRecentActivity,
  useGetProfile,
  useListDeployments,
} from "@workspace/api-client-react";

const STORAGE_KEY = "codecloud-dashboard-layout";

type WidgetId =
  | "recent-projects"
  | "quick-actions"
  | "storage-usage"
  | "activity-feed"
  | "starred-projects"
  | "running-deployments"
  | "notifications";

interface WidgetConfig {
  id: WidgetId;
  title: string;
  icon: React.ElementType;
  defaultEnabled: boolean;
  size: "half" | "full";
}

const WIDGET_REGISTRY: WidgetConfig[] = [
  { id: "recent-projects", title: "Recent Projects", icon: FolderOpen, defaultEnabled: true, size: "full" },
  { id: "quick-actions", title: "Quick Actions", icon: Zap, defaultEnabled: true, size: "half" },
  { id: "storage-usage", title: "Storage Usage", icon: HardDrive, defaultEnabled: true, size: "half" },
  { id: "activity-feed", title: "Activity Feed", icon: Activity, defaultEnabled: true, size: "full" },
  { id: "starred-projects", title: "Starred Projects", icon: Star, defaultEnabled: true, size: "half" },
  { id: "running-deployments", title: "Running Deployments", icon: Rocket, defaultEnabled: true, size: "half" },
  { id: "notifications", title: "Notifications", icon: Bell, defaultEnabled: true, size: "half" },
];

interface DashboardLayout {
  order: WidgetId[];
  hidden: WidgetId[];
}

function getDefaultLayout(): DashboardLayout {
  return {
    order: WIDGET_REGISTRY.map((w) => w.id),
    hidden: [],
  };
}

function loadLayout(): DashboardLayout {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DashboardLayout;
      const allIds = WIDGET_REGISTRY.map((w) => w.id);
      const validOrder = parsed.order.filter((id) => allIds.includes(id));
      const missing = allIds.filter((id) => !validOrder.includes(id));
      return {
        order: [...validOrder, ...missing],
        hidden: parsed.hidden.filter((id) => allIds.includes(id)),
      };
    }
  } catch {}
  return getDefaultLayout();
}

function saveLayout(layout: DashboardLayout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

const PLAN_LIMITS = {
  free: { storage: 1073741824, label: "Free" },
  pro: { storage: 21474836480, label: "Pro" },
  team: { storage: -1, label: "Team" },
};

const LANG_COLORS: Record<string, string> = {
  javascript: "bg-yellow-500/20 text-yellow-400",
  typescript: "bg-blue-500/20 text-blue-400",
  python: "bg-green-500/20 text-green-400",
  html: "bg-orange-500/20 text-orange-400",
  go: "bg-cyan-500/20 text-cyan-300",
  rust: "bg-red-500/20 text-red-400",
};

function getLangStyle(lang: string) {
  return LANG_COLORS[lang.toLowerCase()] || "bg-primary/10 text-primary";
}

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

function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const d = new Date(date).getTime();
  const diff = now - d;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function RecentProjectsWidget() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const projects = stats?.recentProjects ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
            <div className="w-8 h-8 rounded bg-muted" />
            <div className="flex-1">
              <div className="h-3 w-32 bg-muted rounded mb-1" />
              <div className="h-2 w-16 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-6">
        <FolderOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No projects yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {projects.slice(0, 5).map((p) => (
        <Link key={p.id} href={`/project/${p.id}`}>
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getLangStyle(p.language)}`}>
                <Code2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm">{p.name}</p>
                  {p.isPublic ? (
                    <Eye className="w-2.5 h-2.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground capitalize">{p.language}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full ${p.containerStatus === "running" ? "bg-emerald-400" : "bg-zinc-500"}`} />
              <span>{formatDate(p.updatedAt)}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function QuickActionsWidget({ onCreateProject }: { onCreateProject?: () => void }) {
  const actions = [
    { label: "New Project", icon: Plus, href: undefined, onClick: onCreateProject },
    { label: "Explore", icon: Eye, href: "/explore", onClick: undefined },
    { label: "Settings", icon: Settings, href: "/settings", onClick: undefined },
    { label: "Pricing", icon: Zap, href: "/pricing", onClick: undefined },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((a) => {
        const content = (
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border/40 hover:border-primary/30 hover:bg-muted/50 transition-all cursor-pointer">
            <a.icon className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium">{a.label}</span>
          </div>
        );
        if (a.href) {
          return <Link key={a.label} href={a.href}>{content}</Link>;
        }
        return (
          <div key={a.label} onClick={a.onClick}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function StorageUsageWidget() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: profile } = useGetProfile();

  const userPlan = (profile?.plan as keyof typeof PLAN_LIMITS) || "free";
  const planLimits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;
  const storageUsed = stats?.storageUsedBytes ?? 0;
  const storagePercent = planLimits.storage > 0 ? Math.min(100, (storageUsed / planLimits.storage) * 100) : 0;
  const projectCount = stats?.totalProjects ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-2 bg-muted rounded-full" />
        <div className="h-2 bg-muted rounded-full w-3/4" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-muted-foreground">Storage</span>
          <span className="font-medium text-xs">
            {formatBytes(storageUsed)}
            {planLimits.storage > 0 && ` / ${formatBytes(planLimits.storage)}`}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${storagePercent >= 90 ? "bg-red-500" : storagePercent >= 70 ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${storagePercent}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{projectCount} project{projectCount !== 1 ? "s" : ""}</span>
        <span className="capitalize">{planLimits.label} plan</span>
      </div>
    </div>
  );
}

function ActivityFeedWidget() {
  const { data: activity, isLoading } = useGetRecentActivity({ limit: 6 });

  const typeIcons: Record<string, React.ElementType> = {
    project_created: Plus,
    file_updated: Code2,
    deployment_created: Rocket,
    collaborator_added: Eye,
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-muted" />
            <div className="flex-1">
              <div className="h-3 w-40 bg-muted rounded mb-1" />
              <div className="h-2 w-20 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activity || activity.length === 0) {
    return (
      <div className="text-center py-6">
        <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activity.map((item) => {
        const Icon = typeIcons[item.type] || Activity;
        return (
          <Link key={item.id} href={`/project/${item.projectId}`}>
            <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center mt-0.5 shrink-0">
                <Icon className="w-3 h-3 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{item.description}</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function StarredProjectsWidget() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const projects = stats?.recentProjects ?? [];
  const starred = projects.filter((p: any) => p.starsCount > 0).slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-2">
            <div className="w-6 h-6 rounded bg-muted" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (starred.length === 0) {
    return (
      <div className="text-center py-6">
        <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No starred projects</p>
        <Link href="/explore">
          <Button variant="ghost" size="sm" className="text-xs mt-2">
            Explore projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {starred.map((p) => (
        <Link key={p.id} href={`/project/${p.id}`}>
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-sm font-medium">{p.name}</span>
            </div>
            <span className="text-xs text-muted-foreground capitalize">{p.language}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function RunningDeploymentsWidget() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const projects = stats?.recentProjects ?? [];
  const running = projects.filter((p) => p.containerStatus === "running").slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-2">
            <div className="w-2 h-2 rounded-full bg-muted" />
            <div className="h-3 w-28 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (running.length === 0) {
    return (
      <div className="text-center py-6">
        <Rocket className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No running deployments</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {running.map((p) => (
        <Link key={p.id} href={`/project/${p.id}`}>
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-medium">{p.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">{formatDate(p.updatedAt)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function NotificationsWidget() {
  const [notifications] = useState<{ id: string; message: string; time: string }[]>([]);

  if (notifications.length === 0) {
    return (
      <div className="text-center py-6">
        <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No new notifications</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {notifications.map((n) => (
        <div key={n.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
          <Bell className="w-3.5 h-3.5 text-primary mt-0.5" />
          <div>
            <p className="text-sm">{n.message}</p>
            <p className="text-xs text-muted-foreground">{n.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const WIDGET_COMPONENTS: Record<WidgetId, React.ComponentType<any>> = {
  "recent-projects": RecentProjectsWidget,
  "quick-actions": QuickActionsWidget,
  "storage-usage": StorageUsageWidget,
  "activity-feed": ActivityFeedWidget,
  "starred-projects": StarredProjectsWidget,
  "running-deployments": RunningDeploymentsWidget,
  "notifications": NotificationsWidget,
};

interface DashboardWidgetsProps {
  onCreateProject?: () => void;
}

export default function DashboardWidgets({ onCreateProject }: DashboardWidgetsProps) {
  const [layout, setLayout] = useState<DashboardLayout>(loadLayout);
  const [editMode, setEditMode] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<WidgetId | null>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  const visibleWidgets = layout.order.filter((id) => !layout.hidden.includes(id));

  const handleDragStart = useCallback((e: React.DragEvent, widgetId: WidgetId) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", widgetId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedWidget(null);
    setDragOverWidget(null);
    dragCounter.current = 0;
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, widgetId: WidgetId) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOverWidget(widgetId);
  }, []);

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverWidget(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: WidgetId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") as WidgetId;
    if (sourceId === targetId) return;

    setLayout((prev) => {
      const newOrder = [...prev.order];
      const sourceIdx = newOrder.indexOf(sourceId);
      const targetIdx = newOrder.indexOf(targetId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;
      newOrder.splice(sourceIdx, 1);
      newOrder.splice(targetIdx, 0, sourceId);
      return { ...prev, order: newOrder };
    });

    setDraggedWidget(null);
    setDragOverWidget(null);
    dragCounter.current = 0;
  }, []);

  const toggleWidget = useCallback((widgetId: WidgetId) => {
    setLayout((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(widgetId)
        ? prev.hidden.filter((id) => id !== widgetId)
        : [...prev.hidden, widgetId],
    }));
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(getDefaultLayout());
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Dashboard Widgets</span>
        </div>
        <div className="flex items-center gap-1">
          {editMode && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={resetLayout}>
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
          )}
          <Button
            variant={editMode ? "default" : "ghost"}
            size="sm"
            className="text-xs h-7"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "Done" : "Customize"}
          </Button>
        </div>
      </div>

      {editMode && (
        <div className="mb-4 p-3 rounded-lg border border-border/50 bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">Toggle widgets and drag to reorder:</p>
          <div className="flex flex-wrap gap-2">
            {WIDGET_REGISTRY.map((w) => {
              const isHidden = layout.hidden.includes(w.id);
              return (
                <button
                  key={w.id}
                  onClick={() => toggleWidget(w.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    isHidden
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary border border-primary/20"
                  }`}
                >
                  <w.icon className="w-3 h-3" />
                  {w.title}
                  {isHidden && <Plus className="w-3 h-3" />}
                  {!isHidden && <X className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleWidgets.map((widgetId) => {
          const config = WIDGET_REGISTRY.find((w) => w.id === widgetId);
          if (!config) return null;
          const WidgetComponent = WIDGET_COMPONENTS[widgetId];
          const isDragOver = dragOverWidget === widgetId && draggedWidget !== widgetId;

          return (
            <div
              key={widgetId}
              className={`${config.size === "full" ? "md:col-span-2" : ""}`}
              draggable={editMode}
              onDragStart={(e) => handleDragStart(e, widgetId)}
              onDragEnd={handleDragEnd}
              onDragEnter={(e) => handleDragEnter(e, widgetId)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, widgetId)}
            >
              <Card className={`bg-card border-border/50 transition-all ${
                isDragOver ? "border-primary/50 shadow-lg shadow-primary/10" : ""
              } ${editMode ? "cursor-grab active:cursor-grabbing" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {editMode && (
                        <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                      )}
                      <config.icon className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-sm">{config.title}</CardTitle>
                    </div>
                    {editMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleWidget(widgetId)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <WidgetComponent onCreateProject={onCreateProject} />
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
