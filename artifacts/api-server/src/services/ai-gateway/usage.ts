import type { Provider } from "./registry";
import { db, aiUsageEventsTable } from "@workspace/db";
import { and, eq, gte, sql } from "drizzle-orm";

export interface UsageEvent {
  id: string;
  userId: string;
  projectId: string | null;
  modelId: string;
  provider: Provider;
  mode: "single" | "council" | "judge";
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  cacheHit: boolean;
  byok: boolean;
  servedByFallback: boolean;
  taskType: string;
  rubric?: { correctness: number; completeness: number; styleFit: number; safety: number; total: number };
  ts: number;
}

export interface AlertConfig {
  perTaskUsd: number;
  perDayUsd: number;
  perMonthUsd: number;
  enabled: boolean;
  pausedUntil: number | null;
  acknowledgedAt: number | null;
}

const DEFAULT_ALERTS: AlertConfig = { perTaskUsd: 1, perDayUsd: 10, perMonthUsd: 100, enabled: true, pausedUntil: null, acknowledgedAt: null };

class UsageTracker {
  private events: UsageEvent[] = [];
  private alerts: Map<string, AlertConfig> = new Map();

  emit(ev: Omit<UsageEvent, "id" | "ts">): UsageEvent {
    const full: UsageEvent = { ...ev, id: `ue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ts: Date.now() };
    this.events.push(full);
    if (this.events.length > 50_000) this.events = this.events.slice(-25_000);
    // Fire-and-forget DB persistence so cost dashboards survive restarts.
    // We don't await — the in-memory event is the source of truth for the
    // alert check below; DB is for historical aggregation.
    void db.insert(aiUsageEventsTable).values({
      userId: ev.userId,
      projectId: ev.projectId ?? null,
      modelId: ev.modelId,
      provider: ev.provider,
      mode: ev.mode,
      inputTokens: String(ev.inputTokens),
      outputTokens: String(ev.outputTokens),
      costUsd: ev.costUsd.toFixed(8),
      latencyMs: String(ev.latencyMs),
      cacheHit: ev.cacheHit ? "1" : "0",
      byok: ev.byok ? "1" : "0",
      servedByFallback: ev.servedByFallback ? "1" : "0",
      taskType: ev.taskType,
      rubric: ev.rubric ?? null,
    }).catch(() => { /* swallow — usage logging must not break user requests */ });
    this.checkAlerts(ev.userId, full);
    return full;
  }

  private checkAlerts(userId: string, ev: UsageEvent): void {
    const cfg = this.alerts.get(userId) ?? { ...DEFAULT_ALERTS };
    if (!cfg.enabled) return;
    const dayMs = 24 * 60 * 60 * 1000;
    const monthMs = 30 * dayMs;
    const now = Date.now();
    const dayCost = this.events.filter(e => e.userId === userId && now - e.ts < dayMs).reduce((s, e) => s + e.costUsd, 0);
    const monthCost = this.events.filter(e => e.userId === userId && now - e.ts < monthMs).reduce((s, e) => s + e.costUsd, 0);
    let breached = false;
    if (ev.costUsd > cfg.perTaskUsd) breached = true;
    if (dayCost > cfg.perDayUsd) breached = true;
    if (monthCost > cfg.perMonthUsd) breached = true;
    if (breached) {
      cfg.pausedUntil = now + 60 * 60 * 1000;
      cfg.acknowledgedAt = null;
      this.alerts.set(userId, cfg);
    }
  }

  isPaused(userId: string): { paused: boolean; until: number | null; reason: string | null } {
    const cfg = this.alerts.get(userId);
    if (!cfg || !cfg.pausedUntil) return { paused: false, until: null, reason: null };
    if (cfg.acknowledgedAt && cfg.acknowledgedAt >= cfg.pausedUntil - 60 * 60 * 1000) return { paused: false, until: null, reason: null };
    if (Date.now() > cfg.pausedUntil) return { paused: false, until: null, reason: null };
    return { paused: true, until: cfg.pausedUntil, reason: "Cost alert threshold breached. Acknowledge to resume." };
  }

  acknowledge(userId: string): void {
    const cfg = this.alerts.get(userId) ?? { ...DEFAULT_ALERTS };
    cfg.acknowledgedAt = Date.now();
    cfg.pausedUntil = null;
    this.alerts.set(userId, cfg);
  }

  getAlerts(userId: string): AlertConfig {
    return this.alerts.get(userId) ?? { ...DEFAULT_ALERTS };
  }

  setAlerts(userId: string, patch: Partial<AlertConfig>): AlertConfig {
    const cur = this.alerts.get(userId) ?? { ...DEFAULT_ALERTS };
    const next: AlertConfig = { ...cur, ...patch };
    this.alerts.set(userId, next);
    return next;
  }

  list(filter?: { userId?: string; modelId?: string; mode?: string; sinceMs?: number }): UsageEvent[] {
    return this.events.filter(e =>
      (!filter?.userId || e.userId === filter.userId) &&
      (!filter?.modelId || e.modelId === filter.modelId) &&
      (!filter?.mode || e.mode === filter.mode) &&
      (!filter?.sinceMs || Date.now() - e.ts < filter.sinceMs)
    );
  }

  // DB-backed read paths. These are the source of truth for dashboards/comparison
  // because in-memory `events` is volatile and only used for fast alert checks.
  async listFromDb(filter?: { userId?: string; modelId?: string; mode?: string; sinceMs?: number; limit?: number }): Promise<UsageEvent[]> {
    const since = filter?.sinceMs ? new Date(Date.now() - filter.sinceMs) : new Date(0);
    const conds = [gte(aiUsageEventsTable.createdAt, since)];
    if (filter?.userId) conds.push(eq(aiUsageEventsTable.userId, filter.userId));
    if (filter?.modelId) conds.push(eq(aiUsageEventsTable.modelId, filter.modelId));
    if (filter?.mode) conds.push(eq(aiUsageEventsTable.mode, filter.mode));
    try {
      const rows = await db.select().from(aiUsageEventsTable).where(and(...conds)).orderBy(sql`${aiUsageEventsTable.createdAt} desc`).limit(filter?.limit ?? 500);
      return rows.map(r => ({
        id: r.id, userId: r.userId, projectId: r.projectId,
        modelId: r.modelId, provider: r.provider as Provider, mode: r.mode as UsageEvent["mode"],
        inputTokens: Number(r.inputTokens), outputTokens: Number(r.outputTokens),
        costUsd: Number(r.costUsd), latencyMs: Number(r.latencyMs),
        cacheHit: r.cacheHit === "1", byok: r.byok === "1", servedByFallback: r.servedByFallback === "1",
        taskType: r.taskType, rubric: (r.rubric as UsageEvent["rubric"]) ?? undefined,
        ts: r.createdAt.getTime(),
      }));
    } catch (e) {
      console.error("[ai-gateway] listFromDb failed, falling back to memory:", e);
      return this.list(filter);
    }
  }

  async totalsFromDb(userId: string, sinceMs: number = 24 * 60 * 60 * 1000): Promise<{ totalUsd: number; tasks: number; cacheHits: number; byokTasks: number }> {
    try {
      const since = new Date(Date.now() - sinceMs);
      const rows = await db.select({
        totalUsd: sql<string>`coalesce(sum(${aiUsageEventsTable.costUsd}::numeric), 0)`,
        tasks: sql<number>`count(*)::int`,
        cacheHits: sql<number>`count(*) filter (where ${aiUsageEventsTable.cacheHit} = '1')::int`,
        byokTasks: sql<number>`count(*) filter (where ${aiUsageEventsTable.byok} = '1')::int`,
      }).from(aiUsageEventsTable).where(and(eq(aiUsageEventsTable.userId, userId), gte(aiUsageEventsTable.createdAt, since)));
      const r = rows[0];
      return { totalUsd: Number(r?.totalUsd ?? 0), tasks: Number(r?.tasks ?? 0), cacheHits: Number(r?.cacheHits ?? 0), byokTasks: Number(r?.byokTasks ?? 0) };
    } catch (e) {
      console.error("[ai-gateway] totalsFromDb failed, falling back to memory:", e);
      return {
        totalUsd: this.list({ userId, sinceMs }).reduce((s, e) => s + e.costUsd, 0),
        tasks: this.list({ userId, sinceMs }).length,
        cacheHits: this.list({ userId, sinceMs }).filter(e => e.cacheHit).length,
        byokTasks: this.list({ userId, sinceMs }).filter(e => e.byok).length,
      };
    }
  }

  totals(userId: string, sinceMs: number = 24 * 60 * 60 * 1000): { totalUsd: number; tasks: number; cacheHits: number; byokTasks: number } {
    const evs = this.list({ userId, sinceMs });
    return {
      totalUsd: evs.reduce((s, e) => s + e.costUsd, 0),
      tasks: evs.length,
      cacheHits: evs.filter(e => e.cacheHit).length,
      byokTasks: evs.filter(e => e.byok).length,
    };
  }
}

export const usageTracker = new UsageTracker();
