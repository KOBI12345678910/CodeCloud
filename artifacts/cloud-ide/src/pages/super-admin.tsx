import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Shield, Users, DollarSign, Cpu, Globe, Database,
  Activity, Settings, BarChart3, TrendingUp, Layers, Zap,
  Server, Lock, Eye, AlertTriangle, Clock, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";

const apiUrl = import.meta.env.VITE_API_URL || "";

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalDeployments: number;
}

interface KpiData {
  revenue: { mrr: number; arr: number; growth: number };
  users: { total: number; active: number; new30d: number; churn: number };
  platform: { uptime: number; avgLatency: number; errorRate: number; requests24h: number };
  ai: { totalRequests: number; tokensProcessed: number; avgCostPerRequest: number; modelsActive: number };
}

export default function SuperAdminPage() {
  const token = useAuthStore((s) => s.token);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalProjects: 0, totalDeployments: 0 });
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsR, kpiR] = await Promise.all([
          fetch(`${apiUrl}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/admin-kpi`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (statsR.ok) setStats(await statsR.json());
        if (kpiR.ok) setKpi(await kpiR.json());
      } catch { }
      setLoading(false);
    };
    fetchData();
  }, []);

  const controlPanels = [
    { title: "Pricing Engine", description: "Control all service pricing, margins, and revenue", icon: DollarSign, color: "text-green-400", href: "/admin/pricing", badge: "Revenue" },
    { title: "AI Model Connector", description: "Connect & manage all AI providers worldwide", icon: Cpu, color: "text-purple-400", href: "/model-connector", badge: "AI" },
    { title: "Service Marketplace", description: "Per-service billing: domains, cloud, email, security", icon: Layers, color: "text-blue-400", href: "/service-marketplace", badge: "Billing" },
    { title: "User Management", description: "Manage users, plans, roles, and access", icon: Users, color: "text-cyan-400", href: "/admin", badge: "Users" },
    { title: "Revenue Analytics", description: "MRR, ARR, churn, LTV, and forecasting", icon: TrendingUp, color: "text-emerald-400", href: "/admin/revenue", badge: "Finance" },
    { title: "Security Center", description: "2FA, sessions, API keys, IP allowlists", icon: Shield, color: "text-red-400", href: "/security", badge: "Security" },
    { title: "Deployment Control", description: "Blue-green, canary, rollback, multi-region", icon: Globe, color: "text-orange-400", href: "/autoscale", badge: "DevOps" },
    { title: "Database Management", description: "PostgreSQL, Redis, backups, migrations", icon: Database, color: "text-yellow-400", href: "/baas", badge: "Data" },
    { title: "Platform Monitoring", description: "Uptime, latency, errors, real-time metrics", icon: Activity, color: "text-pink-400", href: "/status", badge: "Ops" },
    { title: "RBAC & Permissions", description: "Roles, permissions, org policies", icon: Lock, color: "text-indigo-400", href: "/rbac", badge: "Access" },
    { title: "White-Label", description: "Custom branding, domains, email templates", icon: Eye, color: "text-teal-400", href: "/white-label", badge: "Brand" },
    { title: "Compliance & GDPR", description: "Data privacy, exports, audit trails", icon: AlertTriangle, color: "text-amber-400", href: "/compliance", badge: "Legal" },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="super-admin-page">
      <div className="border-b border-border bg-gradient-to-r from-red-900/20 via-purple-900/20 to-blue-900/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Shield className="h-7 w-7 text-red-400" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 via-purple-400 to-blue-400 text-transparent bg-clip-text">
                  Super Admin Control Center
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Complete platform control — everything in one place</p>
            </div>
            <div className="flex items-center gap-1 bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full text-xs border border-red-500/20">
              <Shield className="h-3 w-3" />ADMIN ACCESS
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="border rounded-xl p-5 bg-card">
            <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-blue-400" /><span className="text-sm text-muted-foreground">Total Users</span></div>
            <div className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</div>
          </div>
          <div className="border rounded-xl p-5 bg-card">
            <div className="flex items-center gap-2 mb-2"><Server className="h-4 w-4 text-green-400" /><span className="text-sm text-muted-foreground">Projects</span></div>
            <div className="text-3xl font-bold">{stats.totalProjects.toLocaleString()}</div>
          </div>
          <div className="border rounded-xl p-5 bg-card">
            <div className="flex items-center gap-2 mb-2"><Globe className="h-4 w-4 text-purple-400" /><span className="text-sm text-muted-foreground">Deployments</span></div>
            <div className="text-3xl font-bold">{stats.totalDeployments.toLocaleString()}</div>
          </div>
          <div className="border rounded-xl p-5 bg-card">
            <div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-emerald-400" /><span className="text-sm text-muted-foreground">Platform</span></div>
            <div className="text-3xl font-bold text-green-400">99.99%</div>
            <div className="text-xs text-muted-foreground">uptime</div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4">Control Panels</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {controlPanels.map(panel => (
            <Link key={panel.title} href={panel.href}>
              <div className="border rounded-xl p-5 bg-card hover:border-purple-500/30 transition-all hover:shadow-lg hover:shadow-purple-500/5 cursor-pointer group">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg bg-muted group-hover:bg-muted/80 ${panel.color}`}>
                    <panel.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-purple-400 transition-colors">{panel.title}</h3>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{panel.badge}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{panel.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 border rounded-xl p-6 bg-card border-yellow-500/20">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Zap className="h-4 w-4 text-yellow-400" />Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/pricing"><Button size="sm" variant="outline"><DollarSign className="h-3 w-3 mr-1" />Edit Pricing</Button></Link>
            <Link href="/model-connector"><Button size="sm" variant="outline"><Cpu className="h-3 w-3 mr-1" />Add AI Provider</Button></Link>
            <Link href="/admin"><Button size="sm" variant="outline"><Users className="h-3 w-3 mr-1" />Manage Users</Button></Link>
            <Link href="/security"><Button size="sm" variant="outline"><Shield className="h-3 w-3 mr-1" />Security</Button></Link>
            <Link href="/compliance"><Button size="sm" variant="outline"><Lock className="h-3 w-3 mr-1" />Compliance</Button></Link>
            <Link href="/service-marketplace"><Button size="sm" variant="outline"><Layers className="h-3 w-3 mr-1" />Marketplace</Button></Link>
          </div>
        </div>

        <div className="mt-6 border rounded-xl p-6 bg-gradient-to-r from-purple-900/10 to-blue-900/10 border-purple-500/20">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-purple-400" />
            Features No Other Platform Has
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              "Real-time per-token cost ticker in AI chat",
              "Universal AI model connector (25+ providers)",
              "Per-service granular billing (domains, cloud, email, security)",
              "Admin pricing engine with margin control",
              "Revenue simulator with ARR forecasting",
              "Multi-currency support with regional markup",
              "11 payment methods (card, PayPal, crypto, Apple/Google Pay)",
              "Self-hosted model support (Ollama)",
              "Custom OpenAI-compatible endpoint connector",
              "Per-model rate limiting and daily caps",
              "AI model quality scoring and benchmarking",
              "White-label platform with custom branding",
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                <span className="text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
