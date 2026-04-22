import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "wouter";
import { useSession } from "@clerk/react";
import { ArrowLeft, Filter, Search, X, Cpu, Brain, Activity, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Task {
  id: string; prompt: string; state: string; mode: string; tier: string; model: string;
  inputTokens: number; outputTokens: number; costUsd: number; actionCount: number;
  createdAt: string; completedAt: string | null; errorMessage: string | null;
  result: string | null; plan: TaskPlan | null;
}

interface TaskPlanStep { step: string; details?: string; }
interface TaskPlan { plan?: TaskPlanStep[]; summary?: string; }
interface TaskEvent { type: string; payload?: unknown; createdAt?: string; }

interface UsageRow {
  id: string; stepIndex: number; kind: string; model: string | null; endpoint: string | null;
  inputTokens: number; outputTokens: number; cachedInputTokens: number; computeMs: number;
  costUsd: number; pricingVersion: number; createdAt: string;
}

interface UsageSummary {
  taskId: string; totalCostUsd: number; totalInputTokens: number; totalOutputTokens: number;
  rows: UsageRow[];
}

const STATE_COLORS: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  active: "bg-blue-500/15 text-blue-500",
  awaiting_approval: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  completed: "bg-green-500/15 text-green-500",
  failed: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default function TasksPage() {
  const { session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [search, setSearch] = useState("");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [openUsage, setOpenUsage] = useState<UsageSummary | null>(null);
  const [openEvents, setOpenEvents] = useState<TaskEvent[]>([]);

  const authedFetch = useCallback(async (path: string) => {
    const token = await session?.getToken();
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(`${API}${path}`, { headers });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }, [session]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterModel) params.set("model", filterModel);
      if (search.trim()) params.set("q", search.trim());
      params.set("limit", "100");
      const data = await authedFetch(`/agent/tasks-search?${params.toString()}`);
      setTasks(data);
    } catch { /* */ } finally { setLoading(false); }
  }, [authedFetch, filterStatus, filterModel, search]);

  useEffect(() => { void refresh(); }, [refresh]);

  const openDrawer = useCallback(async (t: Task) => {
    setOpenTask(t); setOpenUsage(null); setOpenEvents([]);
    try {
      const [usage, full] = await Promise.all([
        authedFetch(`/agent/tasks/${t.id}/usage`),
        authedFetch(`/agent/tasks/${t.id}`),
      ]);
      setOpenUsage(usage);
      setOpenEvents(full.events || []);
    } catch { /* */ }
  }, [authedFetch]);

  const models = useMemo(() => Array.from(new Set(tasks.map((t) => t.model))).sort(), [tasks]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border">
        <Link href="/dashboard"><ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer" /></Link>
        <Activity className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">Tasks</h1>
        <Link href="/billing" className="ml-auto text-xs text-primary hover:underline">Billing</Link>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts…"
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-card border border-border rounded"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm bg-card border border-border rounded px-2 py-1.5">
            <option value="">All status</option>
            {["queued", "active", "awaiting_approval", "completed", "failed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)} className="text-sm bg-card border border-border rounded px-2 py-1.5">
            <option value="">All models</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => { setSearch(""); setFilterStatus(""); setFilterModel(""); }}>Clear</Button>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground bg-muted/30 border-b border-border">
            <div className="col-span-5">Prompt</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Model</div>
            <div className="col-span-1 text-right">Cost</div>
            <div className="col-span-2 text-right">Created</div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No tasks yet.</div>
          ) : tasks.map((t) => (
            <button key={t.id} onClick={() => openDrawer(t)} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm border-b border-border/30 hover:bg-muted/30 text-left w-full">
              <div className="col-span-5 truncate font-medium">{t.prompt.slice(0, 100)}</div>
              <div className="col-span-2"><span className={`text-[10px] px-2 py-0.5 rounded-full ${STATE_COLORS[t.state] || "bg-muted"}`}>{t.state}</span></div>
              <div className="col-span-2 text-xs font-mono text-muted-foreground truncate">{t.model}</div>
              <div className="col-span-1 text-right font-mono text-xs">${(t.costUsd ?? 0).toFixed(4)}</div>
              <div className="col-span-2 text-right text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </div>

      {openTask && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpenTask(null)}>
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[640px] bg-background border-l border-border overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <div className="text-xs text-muted-foreground font-mono">{openTask.id.slice(0, 8)}</div>
                <h2 className="font-semibold">{openTask.prompt.slice(0, 80)}</h2>
              </div>
              <button onClick={() => setOpenTask(null)} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Status</div><span className={`text-[11px] px-2 py-0.5 rounded-full ${STATE_COLORS[openTask.state]}`}>{openTask.state}</span></div>
                <div><div className="text-xs text-muted-foreground">Mode / Tier</div><div className="font-mono text-xs">{openTask.mode} / {openTask.tier}</div></div>
                <div><div className="text-xs text-muted-foreground">Model</div><div className="font-mono text-xs">{openTask.model}</div></div>
                <div><div className="text-xs text-muted-foreground">Total Cost</div><div className="font-mono">${(openTask.costUsd ?? 0).toFixed(4)}</div></div>
              </div>

              {openTask.errorMessage && (
                <div className="p-3 rounded border border-destructive/40 bg-destructive/10 text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span>{openTask.errorMessage}</span>
                </div>
              )}

              {openTask.plan?.plan && Array.isArray(openTask.plan.plan) && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Plan</div>
                  <ol className="list-decimal pl-5 text-sm space-y-1">
                    {openTask.plan.plan.map((p, i) => (
                      <li key={i}><span className="font-medium">{p.step}</span>{p.details && <span className="text-muted-foreground"> — {p.details}</span>}</li>
                    ))}
                  </ol>
                </div>
              )}

              {openUsage && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex justify-between">
                    <span>Per-step usage</span>
                    <span>{openUsage.totalInputTokens.toLocaleString()} in / {openUsage.totalOutputTokens.toLocaleString()} out · ${openUsage.totalCostUsd.toFixed(6)}</span>
                  </div>
                  <div className="border border-border rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30 text-muted-foreground">
                        <tr><th className="text-left p-2">#</th><th className="text-left p-2">Kind</th><th className="text-right p-2">In</th><th className="text-right p-2">Out</th><th className="text-right p-2">Cost</th><th className="text-right p-2">v</th></tr>
                      </thead>
                      <tbody>
                        {openUsage.rows.map((r) => (
                          <tr key={r.id} className="border-t border-border/30">
                            <td className="p-2 font-mono">{r.stepIndex}</td>
                            <td className="p-2">{r.kind}</td>
                            <td className="p-2 text-right font-mono">{r.inputTokens.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono">{r.outputTokens.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono">${r.costUsd.toFixed(6)}</td>
                            <td className="p-2 text-right text-muted-foreground">{r.pricingVersion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {openEvents.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Activity log</div>
                  <div className="border border-border rounded max-h-72 overflow-y-auto text-[11px] font-mono">
                    {openEvents.map((e, i) => (
                      <div key={i} className="px-2 py-1 border-b border-border/30 flex gap-2">
                        <span className="text-muted-foreground w-12 shrink-0">{(e as TaskEvent & { seq?: number }).seq ?? i}</span>
                        <span className="text-primary w-32 shrink-0">{e.type}</span>
                        <span className="truncate">{JSON.stringify(e.payload).slice(0, 200)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
