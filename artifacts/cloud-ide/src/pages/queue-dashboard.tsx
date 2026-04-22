import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Inbox, RefreshCw, Play, AlertTriangle, CheckCircle,
  Clock, Trash2, RotateCcw, XCircle, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  deadLetter: number;
  throughput: number;
  avgProcessingMs: number;
}

interface QueueJob {
  id: string;
  queue: string;
  name: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  progress: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  failedAt: string | null;
}

interface DashboardData {
  queues: QueueStats[];
  totalJobs: number;
  activeJobs: number;
  failedJobs: number;
  deadLetterJobs: number;
  throughputPerMin: number;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; icon: typeof CheckCircle }> = {
    waiting: { color: "text-yellow-400", bg: "bg-yellow-400/10", icon: Clock },
    active: { color: "text-blue-400", bg: "bg-blue-400/10", icon: Play },
    completed: { color: "text-green-400", bg: "bg-green-400/10", icon: CheckCircle },
    failed: { color: "text-red-400", bg: "bg-red-400/10", icon: XCircle },
    delayed: { color: "text-orange-400", bg: "bg-orange-400/10", icon: Clock },
    "dead-letter": { color: "text-red-400", bg: "bg-red-400/10", icon: AlertTriangle },
  };
  const c = config[status] || config.waiting;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${c.color} ${c.bg}`}>
      <Icon size={10} /> {status}
    </span>
  );
}

export default function QueueDashboardPage() {
  const { theme } = useTheme();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(api("/queues"));
      if (r.ok) setDashboard(await r.json());
    } catch {}
    setLoading(false);
  };

  const loadJobs = async (queueName: string, status?: string) => {
    try {
      const url = status ? api(`/queues/${queueName}/jobs?status=${status}`) : api(`/queues/${queueName}/jobs`);
      const r = await fetch(url);
      if (r.ok) {
        const d = await r.json();
        setJobs(d.jobs || []);
      }
    } catch {}
  };

  const retryJob = async (jobId: string) => {
    try {
      await fetch(api(`/queues/jobs/${jobId}/retry`), { method: "POST" });
      if (selectedQueue) loadJobs(selectedQueue, jobFilter);
      load();
    } catch {}
  };

  const moveToDlq = async (jobId: string) => {
    try {
      await fetch(api(`/queues/jobs/${jobId}/dlq`), { method: "POST" });
      if (selectedQueue) loadJobs(selectedQueue, jobFilter);
      load();
    } catch {}
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selectedQueue) loadJobs(selectedQueue, jobFilter);
  }, [selectedQueue, jobFilter]);

  const dark = theme === "dark";
  const card = dark ? "bg-[#161b22] border-[#1e2533]" : "bg-white border-gray-200";

  return (
    <div className={`min-h-screen ${dark ? "bg-[#0e1117] text-gray-200" : "bg-gray-50 text-gray-900"}`} data-testid="queue-dashboard-page">
      <header className={`border-b ${dark ? "border-[#1e2533] bg-[#161b22]" : "border-gray-200 bg-white"} px-6 py-4`}>
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Queue Dashboard</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={load}>
            <RefreshCw size={12} /> Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {loading && !dashboard ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : dashboard ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Total Jobs", value: dashboard.totalJobs, color: "text-blue-400" },
                { label: "Active", value: dashboard.activeJobs, color: "text-green-400" },
                { label: "Failed", value: dashboard.failedJobs, color: "text-red-400" },
                { label: "Dead Letter", value: dashboard.deadLetterJobs, color: "text-orange-400" },
                { label: "Throughput/min", value: dashboard.throughputPerMin, color: "text-purple-400" },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-4 ${card}`}>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.queues.map(q => (
                <div key={q.name}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${card} ${selectedQueue === q.name ? "ring-2 ring-primary" : ""}`}
                  onClick={() => { setSelectedQueue(q.name); setJobFilter(""); }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm capitalize">{q.name}</span>
                    <Activity size={14} className="text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Waiting</span><div className="font-bold text-yellow-400">{q.waiting}</div></div>
                    <div><span className="text-muted-foreground">Active</span><div className="font-bold text-blue-400">{q.active}</div></div>
                    <div><span className="text-muted-foreground">Completed</span><div className="font-bold text-green-400">{q.completed}</div></div>
                    <div><span className="text-muted-foreground">Failed</span><div className="font-bold text-red-400">{q.failed}</div></div>
                    <div><span className="text-muted-foreground">DLQ</span><div className="font-bold text-orange-400">{q.deadLetter}</div></div>
                    <div><span className="text-muted-foreground">Throughput</span><div className="font-bold">{q.throughput}/min</div></div>
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground">Avg processing: {q.avgProcessingMs}ms</div>
                </div>
              ))}
            </div>

            {selectedQueue && (
              <div className={`rounded-xl border overflow-hidden ${card}`}>
                <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold capitalize">{selectedQueue} Jobs</span>
                    <div className="flex items-center gap-1">
                      {["", "waiting", "active", "completed", "failed", "dead-letter"].map(f => (
                        <button key={f} onClick={() => setJobFilter(f)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${jobFilter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                          {f || "All"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No jobs found</div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {jobs.map(job => (
                      <div key={job.id} className={`flex items-center justify-between px-4 py-2.5 ${dark ? "hover:bg-[#1c2230]" : "hover:bg-gray-50"}`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <StatusBadge status={job.status} />
                          <div className="min-w-0">
                            <div className="text-xs font-medium truncate">{job.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {job.id.slice(0, 20)}... | Attempt {job.attempts}/{job.maxAttempts} | {formatTimeAgo(job.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                          {job.status === "active" && (
                            <div className="w-16 h-1.5 rounded-full bg-muted/30 overflow-hidden mr-2">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${job.progress}%` }} />
                            </div>
                          )}
                          {(job.status === "failed" || job.status === "dead-letter") && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Retry" onClick={() => retryJob(job.id)}>
                              <RotateCcw size={12} />
                            </Button>
                          )}
                          {job.status === "failed" && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-orange-400" title="Move to DLQ" onClick={() => moveToDlq(job.id)}>
                              <Trash2 size={12} />
                            </Button>
                          )}
                          {job.error && (
                            <span className="text-[10px] text-red-400 max-w-[200px] truncate" title={job.error}>{job.error}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">Failed to load queue data. Make sure you have admin access.</div>
        )}
      </main>
    </div>
  );
}
