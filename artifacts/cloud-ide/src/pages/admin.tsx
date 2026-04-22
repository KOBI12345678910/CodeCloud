import { useState } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { Code2, ArrowLeft, Users, FolderOpen, Activity, Shield, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "projects" | "audit">("overview");
  const [userSearch, setUserSearch] = useState("");

  return (
    <div className="min-h-screen bg-background" data-testid="admin-page">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold tracking-tight">CodeCloud</span>
            </Link>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-destructive/20 text-destructive text-xs font-medium">
              <Shield className="w-3 h-3" /> Admin
            </div>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

        <div className="flex gap-6">
          <nav className="w-48 shrink-0 space-y-1">
            {([
              { id: "overview" as const, label: "Overview", icon: Activity },
              { id: "users" as const, label: "Users", icon: Users },
              { id: "projects" as const, label: "Projects", icon: FolderOpen },
              { id: "audit" as const, label: "Audit Log", icon: Shield },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeTab === tab.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 space-y-6">
            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Users</p>
                      <p className="text-2xl font-bold mt-1">-</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Projects</p>
                      <p className="text-2xl font-bold mt-1">-</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Deployments</p>
                      <p className="text-2xl font-bold mt-1">-</p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">System Health</CardTitle>
                    <CardDescription>Platform status overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {["Database", "API Server", "File Storage", "Container Runtime"].map((svc) => (
                        <div key={svc} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                          <span className="text-sm">{svc}</span>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-xs text-emerald-400">Operational</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "users" && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Users</CardTitle>
                      <CardDescription>Manage platform users</CardDescription>
                    </div>
                    <div className="relative w-56">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search users..."
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Connect to the admin API to manage users
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "projects" && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">All Projects</CardTitle>
                  <CardDescription>View and manage all platform projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Connect to the admin API to view all projects
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "audit" && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Audit Log</CardTitle>
                  <CardDescription>Track all platform activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Connect to the admin API to view audit logs
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
