import { useState, useMemo } from "react";
import { X, Bell, Check, CheckCheck, Clock, Filter, Settings, Users, Cloud, Cpu, Sparkles, BellOff, Trash2 } from "lucide-react";

interface Props { onClose: () => void; }

interface Notification {
  id: string;
  category: "system" | "collaboration" | "deployment" | "ai";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  snoozed?: boolean;
}

const CAT_CFG = {
  system: { icon: Cpu, color: "text-blue-400", bg: "bg-blue-400/10", label: "System" },
  collaboration: { icon: Users, color: "text-green-400", bg: "bg-green-400/10", label: "Collaboration" },
  deployment: { icon: Cloud, color: "text-purple-400", bg: "bg-purple-400/10", label: "Deployment" },
  ai: { icon: Sparkles, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "AI" },
};

const INITIAL: Notification[] = [
  { id: "n1", category: "deployment", title: "Deploy succeeded", message: "Production deployment v2.4.1 completed in 45s", timestamp: new Date(Date.now() - 300000).toISOString(), read: false },
  { id: "n2", category: "collaboration", title: "Alice commented", message: "Left a comment on src/auth/login.tsx line 42", timestamp: new Date(Date.now() - 600000).toISOString(), read: false },
  { id: "n3", category: "ai", title: "Code review ready", message: "AI found 3 suggestions in your latest commit", timestamp: new Date(Date.now() - 1200000).toISOString(), read: false },
  { id: "n4", category: "system", title: "Container restarted", message: "Dev container restarted due to OOM (2GB limit)", timestamp: new Date(Date.now() - 1800000).toISOString(), read: false },
  { id: "n5", category: "collaboration", title: "Bob requested review", message: "PR #127: Add payment integration needs your review", timestamp: new Date(Date.now() - 3600000).toISOString(), read: true },
  { id: "n6", category: "deployment", title: "SSL certificate expiring", message: "Certificate for codecloud.dev expires in 14 days", timestamp: new Date(Date.now() - 7200000).toISOString(), read: true },
  { id: "n7", category: "ai", title: "Optimization found", message: "AI detected a potential N+1 query in projects.ts", timestamp: new Date(Date.now() - 10800000).toISOString(), read: true },
  { id: "n8", category: "system", title: "Database backup complete", message: "Daily backup completed successfully (2.4 GB)", timestamp: new Date(Date.now() - 14400000).toISOString(), read: true },
  { id: "n9", category: "deployment", title: "Canary alert", message: "Canary deployment showing 2% error rate increase", timestamp: new Date(Date.now() - 18000000).toISOString(), read: false },
  { id: "n10", category: "collaboration", title: "Carol merged PR", message: "PR #125: Refactor auth middleware has been merged", timestamp: new Date(Date.now() - 21600000).toISOString(), read: true },
];

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationCenter({ onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL);
  const [filter, setFilter] = useState<string>("all");
  const [tab, setTab] = useState<"inbox" | "preferences">("inbox");

  const [prefs, setPrefs] = useState({
    system: { enabled: true, sound: false },
    collaboration: { enabled: true, sound: true },
    deployment: { enabled: true, sound: true },
    ai: { enabled: true, sound: false },
  });

  const filtered = useMemo(() => {
    let list = notifications.filter(n => !n.snoozed);
    if (filter !== "all") list = list.filter(n => n.category === filter);
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, filter]);

  const unreadCount = notifications.filter(n => !n.read && !n.snoozed).length;
  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    notifications.filter(n => !n.read && !n.snoozed).forEach(n => { c[n.category] = (c[n.category] || 0) + 1; });
    return c;
  }, [notifications]);

  const markRead = (id: string) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifications(p => p.map(n => ({ ...n, read: true })));
  const snooze = (id: string) => setNotifications(p => p.map(n => n.id === id ? { ...n, snoozed: true } : n));
  const remove = (id: string) => setNotifications(p => p.filter(n => n.id !== id));
  const togglePref = (cat: string, field: "enabled" | "sound") => setPrefs(p => ({ ...p, [cat]: { ...p[cat as keyof typeof p], [field]: !p[cat as keyof typeof p][field] } }));

  return (
    <div className="h-full flex flex-col bg-background" data-testid="notification-center">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Notifications</span>
          {unreadCount > 0 && <span className="px-1.5 py-0.5 text-[9px] bg-primary text-primary-foreground rounded-full">{unreadCount}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={markAllRead} className="p-0.5 hover:bg-muted rounded" title="Mark all read"><CheckCheck className="w-3.5 h-3.5" /></button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 pt-2 shrink-0">
        <div className="flex gap-1">
          <button onClick={() => setTab("inbox")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "inbox" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>Inbox</button>
          <button onClick={() => setTab("preferences")} className={`px-2.5 py-1 text-[10px] rounded ${tab === "preferences" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}><Settings className="w-3 h-3 inline mr-1" />Prefs</button>
        </div>
        {tab === "inbox" && (
          <div className="flex gap-1 ml-auto">
            <button onClick={() => setFilter("all")} className={`px-2 py-0.5 text-[9px] rounded ${filter === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>All</button>
            {Object.entries(CAT_CFG).map(([key, cfg]) => (
              <button key={key} onClick={() => setFilter(key)} className={`px-2 py-0.5 text-[9px] rounded flex items-center gap-1 ${filter === key ? cfg.bg + " " + cfg.color : "text-muted-foreground hover:bg-muted/50"}`}>
                {cfg.label}{catCounts[key] ? <span className="text-[8px]">({catCounts[key]})</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {tab === "inbox" && (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground"><BellOff className="w-6 h-6 mb-2" /><span className="text-xs">No notifications</span></div>
          ) : filtered.map(n => {
            const cfg = CAT_CFG[n.category];
            const Icon = cfg.icon;
            return (
              <div key={n.id} className={`flex items-start gap-2 rounded-lg border p-2.5 group transition-colors ${n.read ? "border-border/30 bg-card/30" : "border-primary/20 bg-primary/5"}`}>
                <div className={`p-1 rounded ${cfg.bg} shrink-0 mt-0.5`}><Icon className={`w-3 h-3 ${cfg.color}`} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium ${n.read ? "text-muted-foreground" : ""}`}>{n.title}</span>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 truncate">{n.message}</div>
                  <div className="text-[8px] text-muted-foreground mt-1">{timeAgo(n.timestamp)}</div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {!n.read && <button onClick={() => markRead(n.id)} className="p-0.5 hover:bg-muted rounded" title="Mark read"><Check className="w-3 h-3" /></button>}
                  <button onClick={() => snooze(n.id)} className="p-0.5 hover:bg-muted rounded" title="Snooze"><Clock className="w-3 h-3" /></button>
                  <button onClick={() => remove(n.id)} className="p-0.5 hover:bg-muted rounded text-red-400" title="Delete"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            );
          })
        )}
        {tab === "preferences" && (
          <div className="space-y-2">
            {Object.entries(CAT_CFG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const pref = prefs[key as keyof typeof prefs];
              return (
                <div key={key} className="bg-card/50 rounded-lg border border-border/30 p-3">
                  <div className="flex items-center gap-2 mb-2"><div className={`p-1 rounded ${cfg.bg}`}><Icon className={`w-3.5 h-3.5 ${cfg.color}`} /></div><span className="text-xs font-medium">{cfg.label}</span></div>
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between text-[10px]">
                      <span>Enabled</span>
                      <button onClick={() => togglePref(key, "enabled")} className={`w-8 h-4 rounded-full transition-colors ${pref.enabled ? "bg-primary" : "bg-muted"}`}><div className={`w-3 h-3 rounded-full bg-white transition-transform ${pref.enabled ? "translate-x-4.5 ml-[18px]" : "translate-x-0.5 ml-[2px]"}`} /></button>
                    </label>
                    <label className="flex items-center justify-between text-[10px]">
                      <span>Sound</span>
                      <button onClick={() => togglePref(key, "sound")} className={`w-8 h-4 rounded-full transition-colors ${pref.sound ? "bg-primary" : "bg-muted"}`}><div className={`w-3 h-3 rounded-full bg-white transition-transform ${pref.sound ? "translate-x-4.5 ml-[18px]" : "translate-x-0.5 ml-[2px]"}`} /></button>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
