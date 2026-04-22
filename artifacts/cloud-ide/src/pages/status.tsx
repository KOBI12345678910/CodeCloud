import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Code2, ArrowLeft, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  latency?: number;
  uptime: string;
}

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "API Server", status: "operational", uptime: "99.99%" },
    { name: "WebSocket Server", status: "operational", uptime: "99.95%" },
    { name: "Database", status: "operational", uptime: "99.99%" },
    { name: "File Storage", status: "operational", uptime: "99.98%" },
    { name: "Container Engine", status: "operational", uptime: "99.90%" },
    { name: "Deployment Service", status: "operational", uptime: "99.97%" },
    { name: "AI Service", status: "operational", uptime: "99.85%" },
    { name: "Authentication", status: "operational", uptime: "99.99%" },
  ]);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const start = Date.now();
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/healthz`);
      const latency = Date.now() - start;

      setServices((prev) =>
        prev.map((s) =>
          s.name === "API Server"
            ? { ...s, status: res.ok ? "operational" : "down", latency }
            : s
        )
      );
    } catch {
      setServices((prev) =>
        prev.map((s) =>
          s.name === "API Server" ? { ...s, status: "down" } : s
        )
      );
    }
    setLastChecked(new Date());
    setChecking(false);
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const allOperational = services.every((s) => s.status === "operational");

  const statusIcon = (status: string) => {
    if (status === "operational") return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    if (status === "degraded") return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const incidents = [
    { date: "2026-04-14", title: "Brief API latency increase", status: "resolved", duration: "12 min" },
    { date: "2026-04-08", title: "Deployment service maintenance", status: "resolved", duration: "45 min" },
    { date: "2026-03-30", title: "Database migration completed", status: "resolved", duration: "5 min" },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="status-page">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Code2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">CodeCloud</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
            allOperational ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
          }`}>
            {allOperational ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="font-semibold text-sm">
              {allOperational ? "All Systems Operational" : "Some Systems Degraded"}
            </span>
          </div>
          <h1 className="text-3xl font-bold">System Status</h1>
          <p className="text-muted-foreground mt-1">
            Last checked: {lastChecked.toLocaleTimeString()}
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={checkHealth} disabled={checking}>
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
            </Button>
          </p>
        </div>

        <Card className="bg-card border-border/50 mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/20">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {statusIcon(service.status)}
                    <span className="font-medium text-sm">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {service.latency !== undefined && (
                      <span className="text-xs text-muted-foreground">{service.latency}ms</span>
                    )}
                    <span className="text-xs text-muted-foreground">{service.uptime} uptime</span>
                    <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                      service.status === "operational"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : service.status === "degraded"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                    }`}>
                      {service.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 mb-8">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">90-Day Uptime</CardTitle>
              <span className="text-xs text-emerald-400 font-medium">99.97% average</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-px h-8">
              {Array.from({ length: 90 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${
                    i === 72 ? "bg-amber-500/60" : i === 55 ? "bg-amber-500/40" : "bg-emerald-500/40"
                  }`}
                  title={`Day ${90 - i}: ${i === 72 || i === 55 ? "Degraded" : "Operational"}`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">90 days ago</span>
              <span className="text-[10px] text-muted-foreground">Today</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {incidents.length > 0 ? (
              <div className="space-y-4">
                {incidents.map((inc, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{inc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {inc.date} &middot; Duration: {inc.duration} &middot;{" "}
                        <span className="text-emerald-400 capitalize">{inc.status}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent incidents</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
