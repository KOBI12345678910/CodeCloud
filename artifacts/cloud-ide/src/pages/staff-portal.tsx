import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import {
  Shield, Users, DollarSign, Settings, BarChart3, Headphones,
  Package, Activity, ChevronRight, Search, Bell, LogOut,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, Eye, Edit, Trash2, Ban, UserPlus, RefreshCw,
  Globe, Server, Cpu, Database, Mail, FileText, Lock,
  Layers, Zap, ArrowUpRight, Filter, Download, MoreVertical,
  Building2, CreditCard, Receipt, Tag, Percent, Hash,
  MessageSquare, Phone, Star, XCircle, ChevronDown,
  LayoutDashboard, Wrench, BookOpen, Crown, Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const apiUrl = import.meta.env.VITE_API_URL || "";

type StaffSection =
  | "dashboard"
  | "customers"
  | "billing"
  | "support"
  | "platform"
  | "content"
  | "settings";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  projects: number;
  spent: number;
  joinedAt: string;
  lastActive: string;
  country: string;
}

interface Ticket {
  id: string;
  subject: string;
  customer: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "open" | "in-progress" | "waiting" | "resolved";
  category: string;
  createdAt: string;
  assignee: string;
}

const sidebarItems = [
  { id: "dashboard" as const, label: "לוח בקרה", icon: LayoutDashboard },
  { id: "customers" as const, label: "ניהול לקוחות", icon: Users },
  { id: "billing" as const, label: "חיוב ומחירים", icon: DollarSign },
  { id: "support" as const, label: "תמיכה ופניות", icon: Headphones },
  { id: "platform" as const, label: "ניהול פלטפורמה", icon: Server },
  { id: "content" as const, label: "תוכן ותבניות", icon: Package },
  { id: "settings" as const, label: "הגדרות מערכת", icon: Settings },
];

const mockCustomers: StaffUser[] = [
  { id: "u1", name: "Yael Cohen", email: "yael@startup.io", plan: "Pro", status: "active", projects: 12, spent: 4560, joinedAt: "2025-03-15", lastActive: "2026-04-22", country: "IL" },
  { id: "u2", name: "David Kim", email: "david@enterprise.co", plan: "Enterprise", status: "active", projects: 45, spent: 28900, joinedAt: "2024-11-02", lastActive: "2026-04-22", country: "US" },
  { id: "u3", name: "Maria Santos", email: "maria@dev.br", plan: "Core", status: "active", projects: 8, spent: 1240, joinedAt: "2025-06-20", lastActive: "2026-04-21", country: "BR" },
  { id: "u4", name: "Liam O'Brien", email: "liam@agency.ie", plan: "Pro", status: "suspended", projects: 3, spent: 890, joinedAt: "2025-09-10", lastActive: "2026-03-15", country: "IE" },
  { id: "u5", name: "Chen Wei", email: "chen@tech.cn", plan: "Free", status: "active", projects: 2, spent: 0, joinedAt: "2026-01-05", lastActive: "2026-04-20", country: "CN" },
  { id: "u6", name: "Aisha Patel", email: "aisha@fintech.in", plan: "Enterprise", status: "active", projects: 67, spent: 45200, joinedAt: "2024-06-12", lastActive: "2026-04-22", country: "IN" },
  { id: "u7", name: "Tom Mueller", email: "tom@startup.de", plan: "Core", status: "trial", projects: 1, spent: 0, joinedAt: "2026-04-18", lastActive: "2026-04-22", country: "DE" },
  { id: "u8", name: "Sophie Dubois", email: "sophie@design.fr", plan: "Pro", status: "active", projects: 15, spent: 3780, joinedAt: "2025-01-22", lastActive: "2026-04-21", country: "FR" },
];

const mockTickets: Ticket[] = [
  { id: "T-1042", subject: "Deployment fails on Node 22 projects", customer: "David Kim", priority: "critical", status: "open", category: "Deployment", createdAt: "2026-04-22T10:30:00Z", assignee: "Support Team A" },
  { id: "T-1041", subject: "Billing charge discrepancy — $45 overcharge", customer: "Aisha Patel", priority: "high", status: "in-progress", category: "Billing", createdAt: "2026-04-22T09:15:00Z", assignee: "Billing Team" },
  { id: "T-1040", subject: "Cannot connect custom domain", customer: "Sophie Dubois", priority: "medium", status: "waiting", category: "Domains", createdAt: "2026-04-21T16:45:00Z", assignee: "Support Team B" },
  { id: "T-1039", subject: "AI agent not responding in Python projects", customer: "Maria Santos", priority: "high", status: "open", category: "AI", createdAt: "2026-04-21T14:20:00Z", assignee: "AI Team" },
  { id: "T-1038", subject: "Request to increase project limit", customer: "Yael Cohen", priority: "low", status: "resolved", category: "Account", createdAt: "2026-04-20T11:00:00Z", assignee: "Support Team A" },
  { id: "T-1037", subject: "SSO integration not working with Okta", customer: "David Kim", priority: "critical", status: "in-progress", category: "Security", createdAt: "2026-04-20T08:30:00Z", assignee: "Security Team" },
];

const priorityColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400",
  "in-progress": "bg-purple-500/20 text-purple-400",
  waiting: "bg-yellow-500/20 text-yellow-400",
  resolved: "bg-green-500/20 text-green-400",
};

const planBadgeColors: Record<string, string> = {
  Free: "bg-zinc-500/20 text-zinc-400",
  Core: "bg-blue-500/20 text-blue-400",
  Pro: "bg-purple-500/20 text-purple-400",
  Enterprise: "bg-amber-500/20 text-amber-400",
};

function DashboardSection() {
  const kpis = [
    { label: "MRR", value: "$284,500", change: "+12.3%", up: true, icon: DollarSign },
    { label: "לקוחות פעילים", value: "15,842", change: "+8.5%", up: true, icon: Users },
    { label: "פרויקטים פעילים", value: "42,156", change: "+15.2%", up: true, icon: Code2 },
    { label: "Deployments היום", value: "1,847", change: "-2.1%", up: false, icon: Server },
    { label: "פניות פתוחות", value: "23", change: "-18%", up: true, icon: Headphones },
    { label: "Uptime", value: "99.97%", change: "+0.02%", up: true, icon: Activity },
    { label: "AI Requests/hr", value: "12,450", change: "+22%", up: true, icon: Cpu },
    { label: "Churn Rate", value: "1.2%", change: "-0.3%", up: true, icon: TrendingDown },
  ];

  const recentActivity = [
    { action: "לקוח חדש נרשם", detail: "Tom Mueller — Enterprise Trial", time: "5 דקות", type: "user" },
    { action: "תשלום התקבל", detail: "Aisha Patel — $2,400/mo", time: "12 דקות", type: "payment" },
    { action: "פנייה קריטית נפתחה", detail: "T-1042 — Deployment fails", time: "25 דקות", type: "alert" },
    { action: "Deploy הושלם", detail: "david/enterprise-app → production", time: "32 דקות", type: "deploy" },
    { action: "לקוח שדרג", detail: "Chen Wei — Free → Core", time: "1 שעה", type: "upgrade" },
    { action: "אזהרת אבטחה", detail: "5 ניסיונות כניסה כושלים — IP 185.x.x.x", time: "2 שעות", type: "security" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">לוח בקרה</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>עודכן לאחרונה: {new Date().toLocaleTimeString("he-IL")}</span>
          <Button variant="ghost" size="sm"><RefreshCw className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                <kpi.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${kpi.up ? "text-green-400" : "text-red-400"}`}>
                {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">פעילות אחרונה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  item.type === "alert" ? "bg-red-500/20 text-red-400" :
                  item.type === "payment" ? "bg-green-500/20 text-green-400" :
                  item.type === "security" ? "bg-orange-500/20 text-orange-400" :
                  item.type === "upgrade" ? "bg-purple-500/20 text-purple-400" :
                  "bg-blue-500/20 text-blue-400"
                }`}>
                  {item.type === "alert" ? <AlertTriangle className="w-4 h-4" /> :
                   item.type === "payment" ? <DollarSign className="w-4 h-4" /> :
                   item.type === "security" ? <Shield className="w-4 h-4" /> :
                   item.type === "upgrade" ? <TrendingUp className="w-4 h-4" /> :
                   item.type === "deploy" ? <Server className="w-4 h-4" /> :
                   <Users className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.action}</div>
                  <div className="text-xs text-muted-foreground">{item.detail}</div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">לפני {item.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">פניות דחופות</CardTitle>
              <Link href="/staff/support">
                <Button variant="ghost" size="sm" className="text-xs">הצג הכל <ChevronRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockTickets.filter(t => t.status !== "resolved").slice(0, 4).map((ticket) => (
              <div key={ticket.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 hover:bg-muted/30 transition">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${priorityColors[ticket.priority]}`}>
                  {ticket.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{ticket.subject}</div>
                  <div className="text-xs text-muted-foreground">{ticket.customer} · {ticket.id}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[ticket.status]}`}>
                  {ticket.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">בריאות מערכת</div>
            {[
              { name: "API Server", status: "operational", latency: "45ms" },
              { name: "Database", status: "operational", latency: "12ms" },
              { name: "AI Gateway", status: "operational", latency: "120ms" },
              { name: "CDN", status: "operational", latency: "8ms" },
              { name: "WebSocket", status: "degraded", latency: "250ms" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <span className="text-sm">{s.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{s.latency}</span>
                  <div className={`w-2 h-2 rounded-full ${s.status === "operational" ? "bg-green-400" : "bg-yellow-400"}`} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">התפלגות תוכניות</div>
            {[
              { plan: "Free", count: 8420, pct: 53 },
              { plan: "Core", count: 4210, pct: 27 },
              { plan: "Pro", count: 2530, pct: 16 },
              { plan: "Enterprise", count: 682, pct: 4 },
            ].map((p, i) => (
              <div key={i} className="mb-2.5">
                <div className="flex justify-between text-sm mb-1">
                  <span>{p.plan}</span>
                  <span className="text-muted-foreground">{p.count.toLocaleString()} ({p.pct}%)</span>
                </div>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${
                    p.plan === "Enterprise" ? "bg-amber-400" :
                    p.plan === "Pro" ? "bg-purple-400" :
                    p.plan === "Core" ? "bg-blue-400" : "bg-zinc-400"
                  }`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">קיצורי דרך</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "מחירון", href: "/admin/pricing", icon: Tag },
                { label: "מודלים AI", href: "/model-connector", icon: Cpu },
                { label: "GDPR", href: "/admin/compliance", icon: Lock },
                { label: "Observability", href: "/admin/observability", icon: Activity },
                { label: "Super Admin", href: "/super-admin", icon: Crown },
                { label: "תורים", href: "/admin/queues", icon: Layers },
              ].map((shortcut, i) => (
                <Link key={i} href={shortcut.href}>
                  <button className="w-full flex items-center gap-2 p-2 rounded-lg border border-border/30 hover:bg-muted/30 transition text-sm">
                    <shortcut.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    {shortcut.label}
                  </button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CustomersSection() {
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);

  const filtered = mockCustomers.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlan !== "all" && c.plan !== filterPlan) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">ניהול לקוחות</h2>
        <Button size="sm" className="gap-1.5"><UserPlus className="w-3.5 h-3.5" /> הוסף לקוח</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="חפש לפי שם או אימייל..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)} className="px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm">
          <option value="all">כל התוכניות</option>
          <option value="Free">Free</option>
          <option value="Core">Core</option>
          <option value="Pro">Pro</option>
          <option value="Enterprise">Enterprise</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm">
          <option value="all">כל הסטטוסים</option>
          <option value="active">פעיל</option>
          <option value="suspended">מושעה</option>
          <option value="trial">ניסיון</option>
        </select>
        <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-3.5 h-3.5" /> ייצוא</Button>
      </div>

      <Card className="bg-card/50 border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">לקוח</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">תוכנית</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">סטטוס</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">פרויקטים</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">סה"כ חיוב</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">פעילות אחרונה</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">מדינה</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id} className="border-b border-border/20 hover:bg-muted/20 transition cursor-pointer" onClick={() => setSelectedUser(customer)}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                        {customer.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{customer.name}</div>
                        <div className="text-xs text-muted-foreground">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planBadgeColors[customer.plan]}`}>
                      {customer.plan}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      customer.status === "active" ? "bg-green-500/20 text-green-400" :
                      customer.status === "suspended" ? "bg-red-500/20 text-red-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {customer.status === "active" ? "פעיל" : customer.status === "suspended" ? "מושעה" : "ניסיון"}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{customer.projects}</td>
                  <td className="p-3 text-sm font-medium">${customer.spent.toLocaleString()}</td>
                  <td className="p-3 text-sm text-muted-foreground">{new Date(customer.lastActive).toLocaleDateString("he-IL")}</td>
                  <td className="p-3 text-sm">{customer.country}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400"><Ban className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={() => setSelectedUser(null)}>
          <Card className="w-full max-w-2xl bg-card border-border" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-medium text-primary">
                    {selectedUser.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <CardTitle>{selectedUser.name}</CardTitle>
                    <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                  <div className="text-xs text-muted-foreground">תוכנית</div>
                  <div className="text-lg font-bold mt-1">{selectedUser.plan}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                  <div className="text-xs text-muted-foreground">פרויקטים</div>
                  <div className="text-lg font-bold mt-1">{selectedUser.projects}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                  <div className="text-xs text-muted-foreground">סה"כ חיוב</div>
                  <div className="text-lg font-bold mt-1">${selectedUser.spent.toLocaleString()}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">הצטרף:</span> {new Date(selectedUser.joinedAt).toLocaleDateString("he-IL")}</div>
                <div><span className="text-muted-foreground">פעילות אחרונה:</span> {new Date(selectedUser.lastActive).toLocaleDateString("he-IL")}</div>
                <div><span className="text-muted-foreground">מדינה:</span> {selectedUser.country}</div>
                <div><span className="text-muted-foreground">סטטוס:</span> {selectedUser.status}</div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button size="sm" variant="outline" className="gap-1.5"><Edit className="w-3.5 h-3.5" /> ערוך</Button>
                <Button size="sm" variant="outline" className="gap-1.5"><Mail className="w-3.5 h-3.5" /> שלח מייל</Button>
                <Button size="sm" variant="outline" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" /> חיוב</Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-orange-400"><Ban className="w-3.5 h-3.5" /> השעה</Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-red-400"><Trash2 className="w-3.5 h-3.5" /> מחק</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function BillingSection() {
  const [activeTab, setActiveTab] = useState<"plans" | "services" | "coupons" | "invoices">("plans");

  const plans = [
    { name: "Free", price: 0, yearlyPrice: 0, users: 8420, mrr: 0, features: ["3 projects", "Basic AI", "Community support"] },
    { name: "Core", price: 20, yearlyPrice: 18, users: 4210, mrr: 75780, features: ["10 projects", "Advanced AI", "Email support", "Custom domain"] },
    { name: "Pro", price: 100, yearlyPrice: 90, users: 2530, mrr: 227700, features: ["Unlimited projects", "All AI models", "Priority support", "Team collaboration", "Custom branding"] },
    { name: "Enterprise", price: null, yearlyPrice: null, users: 682, mrr: 170500, features: ["Everything in Pro", "SSO/SAML", "SLA", "Dedicated support", "Custom contracts"] },
  ];

  const services = [
    { name: "Custom Domain", price: 5, unit: "/month", active: 2340, revenue: 11700 },
    { name: "SSL Certificate", price: 10, unit: "/year", active: 1890, revenue: 18900 },
    { name: "Extra Storage (10GB)", price: 3, unit: "/month", active: 5620, revenue: 16860 },
    { name: "CI/CD Minutes (1000)", price: 15, unit: "/pack", active: 3210, revenue: 48150 },
    { name: "GPU Access (hourly)", price: 2, unit: "/hour", active: 890, revenue: 42680 },
    { name: "Priority Queue", price: 8, unit: "/month", active: 1560, revenue: 12480 },
    { name: "Backup Pro", price: 5, unit: "/month", active: 4300, revenue: 21500 },
    { name: "Custom AI Model Slot", price: 25, unit: "/month", active: 420, revenue: 10500 },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">חיוב ומחירים</h2>

      <div className="flex gap-2 border-b border-border/50 pb-2">
        {[
          { id: "plans" as const, label: "תוכניות מנוי" },
          { id: "services" as const, label: "שירותים בתשלום" },
          { id: "coupons" as const, label: "קופונים והנחות" },
          { id: "invoices" as const, label: "חשבוניות" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/30"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "plans" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {plans.map((plan, i) => (
              <Card key={i} className="bg-card/50 border-border/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">{plan.name}</span>
                    <Button variant="ghost" size="sm"><Edit className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="text-2xl font-bold">{plan.price !== null ? `$${plan.price}` : "Custom"}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  {plan.yearlyPrice !== null && plan.yearlyPrice !== plan.price && (
                    <div className="text-xs text-muted-foreground">שנתי: ${plan.yearlyPrice}/mo</div>
                  )}
                  <div className="pt-2 border-t border-border/30">
                    <div className="text-xs text-muted-foreground">מנויים: <span className="text-foreground font-medium">{plan.users.toLocaleString()}</span></div>
                    <div className="text-xs text-muted-foreground">MRR: <span className="text-green-400 font-medium">${plan.mrr.toLocaleString()}</span></div>
                  </div>
                  <ul className="space-y-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-green-400" /> {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex gap-2">
            <Link href="/admin/pricing"><Button variant="outline" className="gap-1.5"><Settings className="w-4 h-4" /> מנוע מחירים מתקדם</Button></Link>
            <Link href="/service-marketplace"><Button variant="outline" className="gap-1.5"><Layers className="w-4 h-4" /> שוק שירותים</Button></Link>
          </div>
        </div>
      )}

      {activeTab === "services" && (
        <Card className="bg-card/50 border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">שירות</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">מחיר</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">יחידה</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">לקוחות פעילים</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">הכנסה חודשית</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition">
                    <td className="p-3 text-sm font-medium">{service.name}</td>
                    <td className="p-3 text-sm">${service.price}</td>
                    <td className="p-3 text-sm text-muted-foreground">{service.unit}</td>
                    <td className="p-3 text-sm">{service.active.toLocaleString()}</td>
                    <td className="p-3 text-sm font-medium text-green-400">${service.revenue.toLocaleString()}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "coupons" && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h3 className="text-lg font-semibold">קופונים פעילים</h3>
            <Button size="sm" className="gap-1.5"><Tag className="w-3.5 h-3.5" /> צור קופון</Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { code: "WELCOME20", discount: "20%", type: "percentage", usages: 1250, maxUsages: 5000, expires: "2026-06-30", active: true },
              { code: "STARTUP50", discount: "$50", type: "fixed", usages: 340, maxUsages: 500, expires: "2026-05-15", active: true },
              { code: "ANNUAL25", discount: "25%", type: "percentage", usages: 890, maxUsages: null, expires: null, active: true },
            ].map((coupon, i) => (
              <Card key={i} className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-lg font-bold text-primary">{coupon.code}</code>
                    <div className={`w-2 h-2 rounded-full ${coupon.active ? "bg-green-400" : "bg-red-400"}`} />
                  </div>
                  <div className="text-2xl font-bold">{coupon.discount} <span className="text-sm font-normal text-muted-foreground">off</span></div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div>שימושים: {coupon.usages.toLocaleString()}{coupon.maxUsages ? ` / ${coupon.maxUsages.toLocaleString()}` : " (ללא הגבלה)"}</div>
                    {coupon.expires && <div>תפוגה: {new Date(coupon.expires).toLocaleDateString("he-IL")}</div>}
                  </div>
                  <div className="flex gap-1 mt-3">
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-1">ערוך</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs text-red-400">השבת</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">חשבוניות אחרונות</h3>
            <div className="flex gap-2">
              <Input placeholder="חפש חשבונית..." className="w-64" />
              <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-3.5 h-3.5" /> ייצוא</Button>
            </div>
          </div>
          <Card className="bg-card/50 border-border/50">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">מספר</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">לקוח</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">סכום</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">סטטוס</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">תאריך</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "INV-2024", customer: "Aisha Patel", amount: 2400, status: "paid", date: "2026-04-22" },
                    { id: "INV-2023", customer: "David Kim", amount: 890, status: "paid", date: "2026-04-21" },
                    { id: "INV-2022", customer: "Sophie Dubois", amount: 100, status: "pending", date: "2026-04-20" },
                    { id: "INV-2021", customer: "Yael Cohen", amount: 100, status: "paid", date: "2026-04-19" },
                    { id: "INV-2020", customer: "Maria Santos", amount: 20, status: "overdue", date: "2026-04-10" },
                  ].map((inv, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition">
                      <td className="p-3 text-sm font-mono">{inv.id}</td>
                      <td className="p-3 text-sm">{inv.customer}</td>
                      <td className="p-3 text-sm font-medium">${inv.amount.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          inv.status === "paid" ? "bg-green-500/20 text-green-400" :
                          inv.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>{inv.status === "paid" ? "שולם" : inv.status === "pending" ? "ממתין" : "באיחור"}</span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{new Date(inv.date).toLocaleDateString("he-IL")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function SupportSection() {
  const [filter, setFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const filtered = mockTickets.filter(t => filter === "all" || t.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">תמיכה ופניות</h2>
        <div className="flex gap-2">
          {[
            { id: "all", label: "הכל", count: mockTickets.length },
            { id: "open", label: "פתוח", count: mockTickets.filter(t => t.status === "open").length },
            { id: "in-progress", label: "בטיפול", count: mockTickets.filter(t => t.status === "in-progress").length },
            { id: "waiting", label: "ממתין", count: mockTickets.filter(t => t.status === "waiting").length },
          ].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {[
          { label: "פתוחות", value: mockTickets.filter(t => t.status === "open").length, color: "text-blue-400" },
          { label: "זמן תגובה ממוצע", value: "2.4 שעות", color: "text-green-400" },
          { label: "שביעות רצון", value: "94%", color: "text-purple-400" },
          { label: "נפתרו השבוע", value: "47", color: "text-amber-400" },
        ].map((stat, i) => (
          <Card key={i} className="bg-card/50 border-border/50">
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/50 border-border/50">
        <div className="space-y-1 p-2">
          {filtered.map((ticket) => (
            <div key={ticket.id} onClick={() => setSelectedTicket(ticket)}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition cursor-pointer">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${priorityColors[ticket.priority]}`}>
                {ticket.priority}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{ticket.subject}</div>
                <div className="text-xs text-muted-foreground">{ticket.customer} · {ticket.id} · {ticket.category}</div>
              </div>
              <span className="text-xs text-muted-foreground">{ticket.assignee}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[ticket.status]}`}>
                {ticket.status === "open" ? "פתוח" : ticket.status === "in-progress" ? "בטיפול" : ticket.status === "waiting" ? "ממתין" : "נפתר"}
              </span>
              <span className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString("he-IL")}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PlatformSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">ניהול פלטפורמה</h2>
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: "שרתים ותשתית", desc: "ניטור שרתים, containers, ו-load balancing", icon: Server, href: "/admin/observability", stats: "12 שרתים פעילים", color: "text-blue-400" },
          { title: "מסד נתונים", desc: "ניהול DB, גיבויים, ו-migrations", icon: Database, href: "/settings/backups", stats: "82 טבלאות · 99.9% uptime", color: "text-green-400" },
          { title: "CDN ושמירה במטמון", desc: "הגדרות CDN, edge caching, ו-geo routing", icon: Globe, href: "/cdn-config", stats: "8 נקודות נוכחות", color: "text-purple-400" },
          { title: "AI Gateway", desc: "ניהול מודלים, routing חכם, ועלויות", icon: Cpu, href: "/model-connector", stats: "38 מודלים · 12K req/hr", color: "text-orange-400" },
          { title: "אבטחה", desc: "הגדרות אבטחה, IP filtering, ו-SSL", icon: Shield, href: "/security", stats: "0 אזהרות קריטיות", color: "text-red-400" },
          { title: "תורים ומשימות", desc: "ניהול תורי עבודה ומשימות רקע", icon: Layers, href: "/admin/queues", stats: "3 תורים פעילים", color: "text-cyan-400" },
          { title: "GDPR ותאימות", desc: "בקשות DSAR, מדיניות נתונים, ו-DPA", icon: Lock, href: "/admin/compliance", stats: "2 בקשות בהמתנה", color: "text-amber-400" },
          { title: "Autoscale", desc: "הגדרות scaling אוטומטי ומשאבים", icon: Zap, href: "/autoscale", stats: "Auto · 2-50 instances", color: "text-yellow-400" },
          { title: "לוגים ודיבוג", desc: "צפייה בלוגים, tracing, ו-error tracking", icon: FileText, href: "/error-tracking", stats: "2.1M logs היום", color: "text-indigo-400" },
        ].map((item, i) => (
          <Link key={i} href={item.href}>
            <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                    <div className="text-xs text-primary mt-2 flex items-center gap-1">{item.stats} <ArrowUpRight className="w-3 h-3" /></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ContentSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">תוכן ותבניות</h2>
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: "תבניות פרויקט", desc: "ניהול 12+ תבניות מוכנות לשימוש", icon: Package, href: "/templates", count: "12 תבניות" },
          { title: "עיצוב תבניות", desc: "18 עיצובי Design Templates", icon: Layers, href: "/design-tokens", count: "18 עיצובים" },
          { title: "תוספים (Extensions)", desc: "12 תוספים בשוק התוספים", icon: Zap, href: "/extensions", count: "12 תוספים" },
          { title: "בלוג ותוכן", desc: "ניהול מאמרים ותוכן שיווקי", icon: BookOpen, href: "/blog", count: "8 מאמרים" },
          { title: "מדריכים (Docs)", desc: "ניהול תיעוד ומדריכי שימוש", icon: FileText, href: "/docs", count: "24 עמודים" },
          { title: "בסיס ידע AI", desc: "מסמכי context מותאמים ל-AI", icon: Database, href: "/knowledge-base", count: "6 מסמכים" },
        ].map((item, i) => (
          <Link key={i} href={item.href}>
            <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.desc}</div>
                </div>
                <div className="text-sm text-muted-foreground">{item.count}</div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SettingsSection() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    registrationOpen: true,
    maxProjectsPerUser: 50,
    defaultPlan: "Free",
    trialDays: 14,
    emailNotifications: true,
    slackNotifications: false,
    autoBackup: true,
    backupFrequency: "daily",
    logRetention: 30,
    maxFileSize: 100,
    allowedDomains: "",
    forceSSL: true,
    force2FA: false,
    sessionTimeout: 24,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">הגדרות מערכת</h2>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">הגדרות כלליות</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">מצב תחזוקה</div>
                <div className="text-xs text-muted-foreground">חסום גישה לכל המשתמשים (חוץ מ-admin)</div>
              </div>
              <button onClick={() => setSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                className={`w-11 h-6 rounded-full transition-colors ${settings.maintenanceMode ? "bg-red-500" : "bg-muted/50"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.maintenanceMode ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">הרשמה פתוחה</div>
                <div className="text-xs text-muted-foreground">אפשר למשתמשים חדשים להירשם</div>
              </div>
              <button onClick={() => setSettings(s => ({ ...s, registrationOpen: !s.registrationOpen }))}
                className={`w-11 h-6 rounded-full transition-colors ${settings.registrationOpen ? "bg-green-500" : "bg-muted/50"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.registrationOpen ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">מקסימום פרויקטים למשתמש</label>
              <Input type="number" value={settings.maxProjectsPerUser} onChange={e => setSettings(s => ({ ...s, maxProjectsPerUser: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">ימי ניסיון (Trial)</label>
              <Input type="number" value={settings.trialDays} onChange={e => setSettings(s => ({ ...s, trialDays: Number(e.target.value) }))} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">אבטחה</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">כפה SSL</div>
                <div className="text-xs text-muted-foreground">חייב חיבורים מוצפנים בלבד</div>
              </div>
              <button onClick={() => setSettings(s => ({ ...s, forceSSL: !s.forceSSL }))}
                className={`w-11 h-6 rounded-full transition-colors ${settings.forceSSL ? "bg-green-500" : "bg-muted/50"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.forceSSL ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">כפה 2FA</div>
                <div className="text-xs text-muted-foreground">חייב אימות דו-שלבי לכל המשתמשים</div>
              </div>
              <button onClick={() => setSettings(s => ({ ...s, force2FA: !s.force2FA }))}
                className={`w-11 h-6 rounded-full transition-colors ${settings.force2FA ? "bg-green-500" : "bg-muted/50"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.force2FA ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Session Timeout (שעות)</label>
              <Input type="number" value={settings.sessionTimeout} onChange={e => setSettings(s => ({ ...s, sessionTimeout: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">גודל קובץ מקסימלי (MB)</label>
              <Input type="number" value={settings.maxFileSize} onChange={e => setSettings(s => ({ ...s, maxFileSize: Number(e.target.value) }))} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">התראות</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">התראות אימייל</div>
                <div className="text-xs text-muted-foreground">שלח התראות למנהלים באימייל</div>
              </div>
              <button onClick={() => setSettings(s => ({ ...s, emailNotifications: !s.emailNotifications }))}
                className={`w-11 h-6 rounded-full transition-colors ${settings.emailNotifications ? "bg-green-500" : "bg-muted/50"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.emailNotifications ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">התראות Slack</div>
                <div className="text-xs text-muted-foreground">שלח התראות לערוץ Slack</div>
              </div>
              <button onClick={() => setSettings(s => ({ ...s, slackNotifications: !s.slackNotifications }))}
                className={`w-11 h-6 rounded-full transition-colors ${settings.slackNotifications ? "bg-green-500" : "bg-muted/50"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.slackNotifications ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">גיבויים</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">גיבוי אוטומטי</div>
                <div className="text-xs text-muted-foreground">גבה אוטומטית את מסד הנתונים</div>
              </div>
              <button onClick={() => setSettings(s => ({ ...s, autoBackup: !s.autoBackup }))}
                className={`w-11 h-6 rounded-full transition-colors ${settings.autoBackup ? "bg-green-500" : "bg-muted/50"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.autoBackup ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">תדירות גיבוי</label>
              <select value={settings.backupFrequency} onChange={e => setSettings(s => ({ ...s, backupFrequency: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm">
                <option value="hourly">כל שעה</option>
                <option value="daily">יומי</option>
                <option value="weekly">שבועי</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">שמירת לוגים (ימים)</label>
              <Input type="number" value={settings.logRetention} onChange={e => setSettings(s => ({ ...s, logRetention: Number(e.target.value) }))} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">בטל שינויים</Button>
        <Button>שמור הגדרות</Button>
      </div>
    </div>
  );
}

export default function StaffPortalPage() {
  const { user } = useUser();
  const [activeSection, setActiveSection] = useState<StaffSection>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      <aside className={`${sidebarCollapsed ? "w-16" : "w-64"} bg-card/50 border-l border-border/50 flex flex-col transition-all duration-200 shrink-0`}>
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <div className="font-bold text-sm">CodeCloud</div>
                <div className="text-[10px] text-muted-foreground">פורטל עובדים</div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {sidebarItems.map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                activeSection === item.id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              }`}>
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border/50">
          {!sidebarCollapsed && user && (
            <div className="flex items-center gap-2 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                {user.firstName?.[0] || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{user.fullName || "Admin"}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress || ""}</div>
              </div>
            </div>
          )}
          <div className="flex gap-1">
            <Link href="/" className="flex-1">
              <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs justify-start">
                <LogOut className="w-3.5 h-3.5" /> {!sidebarCollapsed && "חזרה לאתר"}
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="px-2">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sidebarCollapsed ? "rotate-90" : "-rotate-90"}`} />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
          <div className="px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20">
                <Shield className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-medium text-red-400">Staff Portal</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="חיפוש..." className="w-64 pr-9" />
              </div>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">3</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {activeSection === "dashboard" && <DashboardSection />}
          {activeSection === "customers" && <CustomersSection />}
          {activeSection === "billing" && <BillingSection />}
          {activeSection === "support" && <SupportSection />}
          {activeSection === "platform" && <PlatformSection />}
          {activeSection === "content" && <ContentSection />}
          {activeSection === "settings" && <SettingsSection />}
        </div>
      </main>
    </div>
  );
}
