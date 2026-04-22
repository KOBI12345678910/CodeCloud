import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Shield, Download, Trash2, BarChart3, Globe,
  Clock, AlertTriangle, RefreshCw, FileText, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const apiUrl = import.meta.env.VITE_API_URL || "";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function apiFetch(path: string) {
  return fetch(`${apiUrl}/api${path}`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
}

interface DashboardData {
  dsarRequests: {
    pendingCount: number;
    totalExports: number;
    totalDeletions: number;
    recentRequests: Array<{
      id: string;
      userId: string;
      type: string;
      status: string;
      createdAt: string;
    }>;
  };
  auditLogStats: {
    last30Days: number;
  };
  dataResidency: {
    distribution: Record<string, number>;
  };
  consentRates: Record<string, { granted: number; denied: number }>;
  deletionQueue: Array<{
    id: string;
    userId: string;
    scheduledPurgeAt: string;
    createdAt: string;
  }>;
}

export default function AdminCompliancePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/compliance");
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const exportAuditLog = () => {
    window.open(`${apiUrl}/api/admin/compliance/audit-export?format=csv&days=30`, "_blank");
  };

  const regionLabels: Record<string, string> = { us: "United States", eu: "European Union", apac: "Asia-Pacific" };

  return (
    <div className="min-h-screen bg-background" data-testid="admin-compliance-page">
      <header className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border">
        <Link href="/admin"><ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer" /></Link>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">Compliance Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportAuditLog}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export Audit Log
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data.dsarRequests.pendingCount}</p>
                      <p className="text-xs text-muted-foreground">Pending DSAR</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Download className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data.dsarRequests.totalExports}</p>
                      <p className="text-xs text-muted-foreground">Total Exports</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data.dsarRequests.totalDeletions}</p>
                      <p className="text-xs text-muted-foreground">Deletion Requests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data.auditLogStats.last30Days}</p>
                      <p className="text-xs text-muted-foreground">Audit Events (30d)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Data Residency Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(data.dataResidency.distribution).map(([region, orgCount]) => {
                      const total = Object.values(data.dataResidency.distribution).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? (orgCount / total) * 100 : 0;
                      return (
                        <div key={region}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>{regionLabels[region] || region.toUpperCase()}</span>
                            <span className="font-medium">{orgCount} orgs ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" /> Consent Rates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(data.consentRates).map(([category, rates]) => {
                      const total = rates.granted + rates.denied;
                      const pct = total > 0 ? (rates.granted / total) * 100 : 0;
                      return (
                        <div key={category}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="capitalize">{category}</span>
                            <span className="font-medium">{pct.toFixed(0)}% accepted</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${category === "necessary" ? "bg-green-500" : category === "analytics" ? "bg-blue-500" : "bg-purple-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(data.consentRates).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No consent data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500" /> Deletion Queue
                </CardTitle>
                <CardDescription>Accounts scheduled for permanent deletion</CardDescription>
              </CardHeader>
              <CardContent>
                {data.deletionQueue.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No pending deletions</p>
                ) : (
                  <div className="space-y-2">
                    {data.deletionQueue.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <Trash2 className="w-4 h-4 text-red-500" />
                          <div>
                            <p className="text-sm font-mono">{d.userId.slice(0, 8)}...</p>
                            <p className="text-xs text-muted-foreground">Requested {new Date(d.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-red-500">Purge on</p>
                          <p className="text-sm font-medium">{new Date(d.scheduledPurgeAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Recent DSAR Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.dsarRequests.recentRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No requests yet</p>
                ) : (
                  <div className="space-y-2">
                    {data.dsarRequests.recentRequests.slice(0, 10).map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          {r.type === "export" ? <Download className="w-4 h-4 text-blue-500" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                          <div>
                            <p className="text-sm capitalize">{r.type} request</p>
                            <p className="text-xs text-muted-foreground font-mono">{r.userId.slice(0, 8)}...</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${r.status === "completed" ? "bg-green-500/20 text-green-500" : r.status === "pending" ? "bg-yellow-500/20 text-yellow-500" : r.status === "cancelled" ? "bg-muted text-muted-foreground" : "bg-blue-500/20 text-blue-500"}`}>
                            {r.status}
                          </span>
                          <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
