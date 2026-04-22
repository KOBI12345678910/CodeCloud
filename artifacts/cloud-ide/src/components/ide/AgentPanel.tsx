import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@clerk/react";
import { io, type Socket } from "socket.io-client";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import {
  Bot, Send, X, Loader2, Copy, Check, Paperclip, Crosshair,
  Square, Zap, History, GitBranch, RotateCcw, Sparkles, ChevronDown, AlertTriangle, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

type Mode = "plan" | "build" | "background";
type Tier = "standard" | "power" | "max";
type TaskState = "draft" | "planned" | "queued" | "active" | "awaiting_approval" | "completed" | "failed" | "cancelled";

interface AgentEvent {
  id?: string;
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt?: string;
}

interface Task {
  id: string;
  prompt: string;
  state: TaskState;
  mode: Mode;
  tier: Tier;
  model: string;
  result: string | null;
  errorMessage: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  actionCount: number;
  plan: { plan?: { step: string; details?: string }[] } | null;
  conversationId: string | null;
  createdAt: string;
}

interface Checkpoint {
  id: string;
  label: string;
  fileCount: number;
  isFinal: boolean;
  createdAt: string;
}

interface Props {
  projectId: string;
  activeFilePath?: string;
  getActiveFileContent: () => string;
  getActiveFileLanguage: () => string;
  getRecentErrors: () => string;
  applyToActiveFile: (code: string) => void;
  insertAtCursor: (code: string) => void;
  onClose: () => void;
}

const TIER_LABEL: Record<Tier, string> = { standard: "Standard", power: "Power", max: "Max" };
const MODE_LABEL: Record<Mode, string> = { plan: "Plan", build: "Build", background: "Background" };

interface ChatRow {
  kind: "user" | "assistant" | "tool" | "checkpoint" | "rollback" | "plan" | "error" | "state";
  text?: string;
  toolName?: string;
  toolInput?: unknown;
  toolResult?: unknown;
  toolError?: string;
  cpId?: string;
  cpLabel?: string;
  state?: TaskState;
  plan?: { step: string; details?: string }[];
  ts: number;
}

function eventsToRows(events: AgentEvent[]): ChatRow[] {
  const rows: ChatRow[] = [];
  const toolMap = new Map<string, ChatRow>();
  for (const e of events) {
    const ts = e.createdAt ? new Date(e.createdAt).getTime() : Date.now();
    const p = e.payload as Record<string, unknown>;
    if (e.type === "user_message") rows.push({ kind: "user", text: String(p.content ?? ""), ts });
    else if (e.type === "assistant_message") rows.push({ kind: "assistant", text: String(p.content ?? ""), ts });
    else if (e.type === "tool_call") {
      const r: ChatRow = { kind: "tool", toolName: String(p.name ?? ""), toolInput: p.input, ts };
      const id = String(p.id ?? "");
      if (id) toolMap.set(id, r);
      rows.push(r);
    } else if (e.type === "tool_result") {
      const id = String(p.id ?? "");
      const r = id ? toolMap.get(id) : null;
      if (r) r.toolResult = p.result;
      else rows.push({ kind: "tool", toolName: String(p.name ?? ""), toolResult: p.result, ts });
    } else if (e.type === "tool_error") {
      const id = String(p.id ?? "");
      const r = id ? toolMap.get(id) : null;
      if (r) r.toolError = String(p.error ?? "");
      else rows.push({ kind: "error", text: String(p.error ?? ""), ts });
    } else if (e.type === "checkpoint") rows.push({ kind: "checkpoint", cpId: String(p.checkpointId ?? ""), cpLabel: String(p.label ?? "checkpoint"), ts });
    else if (e.type === "rollback") rows.push({ kind: "rollback", cpLabel: String(p.label ?? ""), ts });
    else if (e.type === "plan") rows.push({ kind: "plan", plan: (p.plan as { step: string; details?: string }[]) ?? [], ts });
    else if (e.type === "state_change") rows.push({ kind: "state", state: p.state as TaskState, ts });
  }
  return rows;
}

export default function AgentPanel({
  projectId, activeFilePath, getActiveFileContent, getActiveFileLanguage, getRecentErrors,
  applyToActiveFile, onClose,
}: Props) {
  const { session } = useSession();
  const [mode, setMode] = useState<Mode>("build");
  const [tier, setTier] = useState<Tier>("standard");
  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  const [includeFile, setIncludeFile] = useState(false);
  const [includeErrors, setIncludeErrors] = useState(false);
  const [diffOpen, setDiffOpen] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<{ path: string; status: string }[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const apiBase = useMemo(() => API, []);

  const authedFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await session?.getToken();
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
    const res = await fetch(`${apiBase}${path}`, { ...init, headers });
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    return res.json();
  }, [session, apiBase]);

  const refreshTasks = useCallback(async () => {
    try {
      const t = await authedFetch(`/agent/tasks?projectId=${projectId}`);
      setTasks(t);
    } catch { /* noop */ }
  }, [authedFetch, projectId]);

  useEffect(() => { void refreshTasks(); }, [refreshTasks]);

  const loadTask = useCallback(async (taskId: string) => {
    setActiveTaskId(taskId);
    try {
      const data = await authedFetch(`/agent/tasks/${taskId}`);
      setActiveTask(data.task);
      setEvents(data.events);
      setCheckpoints(data.checkpoints);
    } catch { /* noop */ }
  }, [authedFetch]);

  // Socket connection for live events
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let socket: Socket | null = null;
    (async () => {
      const token = await session.getToken();
      if (!token || cancelled) return;
      const apiUrl = import.meta.env.VITE_API_URL || "";
      socket = io(apiUrl, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: { token, userName: "agent-panel" },
      });
      socketRef.current = socket;
      socket.on("connect", () => {
        socket!.emit("project:join", { projectId });
      });
      socket.on("agent:event", (evt: { taskId: string; seq: number; type: string; payload: Record<string, unknown>; at: number }) => {
        if (evt.taskId !== activeTaskIdRef.current) {
          if (evt.type === "state_change" || evt.type === "user_message") void refreshTasks();
          return;
        }
        setEvents((prev) => {
          if (prev.some((p) => p.seq === evt.seq)) return prev;
          return [...prev, { seq: evt.seq, type: evt.type, payload: evt.payload, createdAt: new Date(evt.at).toISOString() }].sort((a, b) => a.seq - b.seq);
        });
        if (evt.type === "state_change") {
          setActiveTask((t) => t ? { ...t, state: (evt.payload.state as TaskState) ?? t.state } : t);
          void refreshTasks();
        }
        if (evt.type === "cost_update") {
          const p = evt.payload as { inputTokens: number; outputTokens: number; costUsd: number };
          setActiveTask((t) => t ? { ...t, inputTokens: p.inputTokens, outputTokens: p.outputTokens, costUsd: p.costUsd } : t);
        }
        if (evt.type === "checkpoint") {
          void authedFetch(`/agent/tasks/${evt.taskId}/checkpoints`).then(setCheckpoints).catch(() => {});
        }
      });
    })();
    return () => { cancelled = true; socket?.disconnect(); socketRef.current = null; };
  }, [session, projectId, refreshTasks, authedFetch]);

  const activeTaskIdRef = useRef<string | null>(null);
  useEffect(() => { activeTaskIdRef.current = activeTaskId; }, [activeTaskId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [events.length, activeTaskId]);

  const submit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    let prompt = trimmed;
    const ctxParts: string[] = [];
    if (includeFile && activeFilePath) {
      ctxParts.push(`Active file: ${activeFilePath}\n\`\`\`${getActiveFileLanguage()}\n${getActiveFileContent().slice(0, 6000)}\n\`\`\``);
    }
    if (includeErrors) {
      const errs = getRecentErrors();
      if (errs.trim()) ctxParts.push(`Recent terminal errors:\n\`\`\`\n${errs}\n\`\`\``);
    }
    if (ctxParts.length) prompt = `${trimmed}\n\n---\n${ctxParts.join("\n\n")}`;

    setInput("");
    try {
      const created = await authedFetch("/agent/tasks", {
        method: "POST",
        body: JSON.stringify({
          projectId, prompt, mode, tier,
          conversationId: activeTask?.conversationId ?? null,
        }),
      });
      await refreshTasks();
      await loadTask(created.taskId);
    } catch (e) {
      console.error("agent: failed to create task", e);
    }
  }, [input, includeFile, includeErrors, activeFilePath, getActiveFileContent, getActiveFileLanguage, getRecentErrors,
      authedFetch, projectId, mode, tier, activeTask, refreshTasks, loadTask]);

  const stopTask = useCallback(async () => {
    if (!activeTaskId) return;
    try { await authedFetch(`/agent/tasks/${activeTaskId}/cancel`, { method: "POST" }); } catch { /* noop */ }
  }, [authedFetch, activeTaskId]);

  const approvePlan = useCallback(async () => {
    if (!activeTaskId) return;
    try {
      await authedFetch(`/agent/tasks/${activeTaskId}/approve`, { method: "POST" });
      await loadTask(activeTaskId);
    } catch { /* noop */ }
  }, [authedFetch, activeTaskId, loadTask]);

  const rollback = useCallback(async (cpId: string) => {
    if (!confirm("Roll back the project to this checkpoint? This will overwrite current files.")) return;
    try {
      await authedFetch(`/agent/checkpoints/${cpId}/rollback`, { method: "POST" });
      if (activeTaskId) await loadTask(activeTaskId);
    } catch { /* noop */ }
  }, [authedFetch, activeTaskId, loadTask]);

  const showDiff = useCallback(async (cpId: string) => {
    setDiffOpen(cpId);
    try {
      const data = await authedFetch(`/agent/checkpoints/${cpId}/diff`);
      setDiffData(data.diff ?? []);
    } catch { setDiffData([]); }
  }, [authedFetch]);

  const copy = useCallback((key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => k === key ? null : k), 1200);
  }, []);

  const regenerate = useCallback(async (userText: string) => {
    setInput(userText);
  }, []);

  const rows = useMemo(() => eventsToRows(events), [events]);
  const isRunning = activeTask?.state === "active" || activeTask?.state === "queued";
  const awaitingApproval = activeTask?.state === "awaiting_approval";

  return (
    <div className="fixed top-0 right-0 h-full w-[460px] bg-card border-l border-border shadow-2xl flex flex-col z-40" data-testid="agent-panel">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0">
        <Bot className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">AI Agent</span>
        <select
          className="ml-2 text-xs bg-background border border-border rounded px-1.5 py-0.5"
          value={tier}
          onChange={(e) => setTier(e.target.value as Tier)}
          data-testid="agent-tier-select"
        >
          <option value="standard">Standard</option>
          <option value="power">Power</option>
          <option value="max">Max</option>
        </select>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowCheckpoints((v) => !v)} data-testid="agent-checkpoints-btn">
            <GitBranch className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowHistory((v) => !v)} data-testid="agent-history-btn">
            <History className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onClose} data-testid="agent-close-btn">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Status strip */}
      {activeTask && (
        <div className="px-3 py-1.5 text-[11px] flex items-center gap-2 border-b border-border/60 bg-muted/30 shrink-0">
          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${
            activeTask.state === "active" ? "bg-blue-500/20 text-blue-400" :
            activeTask.state === "completed" ? "bg-green-500/20 text-green-400" :
            activeTask.state === "failed" ? "bg-red-500/20 text-red-400" :
            activeTask.state === "awaiting_approval" ? "bg-yellow-500/20 text-yellow-400" :
            "bg-muted text-muted-foreground"
          }`}>{activeTask.state}</span>
          <span className="text-muted-foreground">{MODE_LABEL[activeTask.mode]} · {TIER_LABEL[activeTask.tier]}</span>
          <span className="ml-auto flex items-center gap-1 text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            {activeTask.actionCount} actions
          </span>
          {isRunning && (
            <Button size="sm" variant="destructive" className="h-5 px-1.5 text-[10px]" onClick={stopTask} data-testid="agent-stop-btn">
              <Square className="w-3 h-3 mr-1" /> Stop
            </Button>
          )}
        </div>
      )}

      {/* History sidebar */}
      {showHistory && (
        <div className="absolute top-[37px] right-0 w-[300px] max-h-[60%] overflow-y-auto bg-popover border border-border rounded shadow-lg z-50">
          <div className="p-2 text-xs font-semibold border-b border-border">Recent tasks</div>
          {tasks.length === 0 && <div className="p-3 text-xs text-muted-foreground">No tasks yet</div>}
          {tasks.map((t) => (
            <button key={t.id} className={`w-full text-left p-2 text-xs hover:bg-muted border-b border-border/40 ${t.id === activeTaskId ? "bg-muted/50" : ""}`}
              onClick={() => { void loadTask(t.id); setShowHistory(false); }} data-testid={`agent-task-${t.id}`}>
              <div className="truncate font-medium">{t.prompt}</div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                <span>{t.state}</span>·<span>{TIER_LABEL[t.tier]}</span>·<span>${(t.costUsd ?? 0).toFixed(4)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Checkpoints panel */}
      {showCheckpoints && (
        <div className="absolute top-[37px] right-0 w-[340px] max-h-[60%] overflow-y-auto bg-popover border border-border rounded shadow-lg z-50">
          <div className="p-2 text-xs font-semibold border-b border-border flex items-center justify-between">
            <span>Checkpoints</span>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setShowCheckpoints(false)}>Close</Button>
          </div>
          {checkpoints.length === 0 && <div className="p-3 text-xs text-muted-foreground">No checkpoints</div>}
          {checkpoints.map((cp) => (
            <div key={cp.id} className="p-2 border-b border-border/40 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{cp.label}</span>
                {cp.isFinal && <span className="text-[9px] uppercase bg-primary/20 text-primary px-1 rounded">final</span>}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{cp.fileCount} files · {new Date(cp.createdAt).toLocaleTimeString()}</div>
              <div className="flex gap-1 mt-1">
                <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => showDiff(cp.id)} data-testid={`agent-cp-diff-${cp.id}`}>Diff</Button>
                <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => rollback(cp.id)} data-testid={`agent-cp-rollback-${cp.id}`}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Roll back
                </Button>
              </div>
              {diffOpen === cp.id && (
                <div className="mt-2 max-h-32 overflow-y-auto bg-background border border-border rounded p-1.5">
                  {diffData.length === 0 && <div className="text-[10px] text-muted-foreground">No file changes vs. current</div>}
                  {diffData.map((d) => (
                    <div key={d.path} className="text-[10px] flex gap-1.5">
                      <span className={d.status === "added" ? "text-green-400" : d.status === "removed" ? "text-red-400" : "text-yellow-400"}>{d.status[0].toUpperCase()}</span>
                      <span className="truncate">{d.path}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3" data-testid="agent-messages">
        {!activeTaskId && (
          <div className="text-center text-xs text-muted-foreground mt-12">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Describe what you want the Agent to build, plan, or fix.
          </div>
        )}
        {rows.map((r, i) => {
          if (r.kind === "user") return (
            <div key={i} className="flex justify-end group">
              <div className="max-w-[88%] bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 text-xs whitespace-pre-wrap">
                {r.text}
              </div>
            </div>
          );
          if (r.kind === "assistant") return (
            <div key={i} className="group relative">
              <div className="max-w-[92%] bg-muted/40 rounded-lg px-3 py-2 text-xs prose prose-invert prose-sm max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{r.text || ""}</ReactMarkdown>
              </div>
              <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button className="p-1 rounded hover:bg-background" title="Copy" onClick={() => copy(`a-${i}`, r.text || "")}>
                  {copiedKey === `a-${i}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <button className="p-1 rounded hover:bg-background" title="Use as edit" onClick={() => applyToActiveFile(r.text || "")}>
                  <Sparkles className="w-3 h-3" />
                </button>
                <button className="p-1 rounded hover:bg-background" title="Revise" onClick={() => regenerate(`Revise the previous answer: ${(r.text || "").slice(0, 200)}`)}>
                  <Wand />
                </button>
              </div>
            </div>
          );
          if (r.kind === "tool") return (
            <div key={i} className="border border-border/60 rounded px-2 py-1.5 text-[11px] bg-background/40">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="font-mono font-semibold">{r.toolName}</span>
                {r.toolError ? <span className="text-red-400 ml-auto">error</span> :
                 r.toolResult !== undefined ? <span className="text-green-400 ml-auto">ok</span> :
                 <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
              </div>
              {r.toolInput !== undefined && (
                <details className="mt-0.5">
                  <summary className="text-[10px] text-muted-foreground cursor-pointer">input</summary>
                  <pre className="text-[10px] overflow-x-auto bg-muted/30 p-1 rounded mt-0.5">{JSON.stringify(r.toolInput, null, 2)}</pre>
                </details>
              )}
              {r.toolError && <div className="mt-0.5 text-[10px] text-red-400">{r.toolError}</div>}
            </div>
          );
          if (r.kind === "checkpoint") return (
            <div key={i} className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
              <GitBranch className="w-3 h-3" /> Checkpoint: {r.cpLabel}
              {r.cpId && (
                <button className="underline" onClick={() => r.cpId && rollback(r.cpId)} data-testid={`agent-inline-rollback-${r.cpId}`}>
                  roll back
                </button>
              )}
            </div>
          );
          if (r.kind === "rollback") return <div key={i} className="text-[10px] text-center text-yellow-500">↶ Rolled back: {r.cpLabel}</div>;
          if (r.kind === "plan") return (
            <div key={i} className="border border-yellow-500/40 bg-yellow-500/5 rounded p-2 text-xs">
              <div className="font-semibold mb-1 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Proposed plan</div>
              <ol className="space-y-1 list-decimal pl-4">
                {(r.plan ?? []).map((s, idx) => (
                  <li key={idx}><span className="font-medium">{s.step}</span>{s.details ? <div className="text-[11px] text-muted-foreground">{s.details}</div> : null}</li>
                ))}
              </ol>
              {awaitingApproval && (
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" className="h-7 text-[11px]" onClick={approvePlan} data-testid="agent-approve-plan">Approve & build</Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={stopTask}>Cancel</Button>
                </div>
              )}
            </div>
          );
          if (r.kind === "error") return <div key={i} className="text-[11px] text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {r.text}</div>;
          if (r.kind === "state") return <div key={i} className="text-[10px] text-center text-muted-foreground">→ {r.state}</div>;
          return null;
        })}
        {isRunning && rows[rows.length - 1]?.kind !== "tool" && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Working…
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-2 shrink-0 space-y-2">
        <div className="flex flex-wrap gap-1">
          {(["plan", "build", "background"] as Mode[]).map((m) => (
            <button key={m}
              className={`text-[11px] px-2 py-0.5 rounded border ${mode === m ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              onClick={() => setMode(m)} data-testid={`agent-mode-${m}`}>
              {MODE_LABEL[m]}
            </button>
          ))}
          <button
            className={`text-[11px] px-2 py-0.5 rounded border flex items-center gap-1 ${includeFile ? "bg-primary/20 border-primary/50" : "border-border text-muted-foreground hover:bg-muted"}`}
            onClick={() => setIncludeFile((v) => !v)} title={activeFilePath ? `Include ${activeFilePath}` : "No active file"}
            disabled={!activeFilePath} data-testid="agent-attach-file">
            <Paperclip className="w-3 h-3" /> File
          </button>
          <button
            className={`text-[11px] px-2 py-0.5 rounded border flex items-center gap-1 ${includeErrors ? "bg-primary/20 border-primary/50" : "border-border text-muted-foreground hover:bg-muted"}`}
            onClick={() => setIncludeErrors((v) => !v)} title="Include recent terminal errors"
            data-testid="agent-attach-errors">
            <Crosshair className="w-3 h-3" /> Errors
          </button>
        </div>
        <div className="flex gap-1.5">
          <textarea
            className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs resize-none min-h-[44px] max-h-32"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); } }}
            placeholder={mode === "plan" ? "Describe a feature; agent will draft a plan…" :
                         mode === "background" ? "Background task; will run async…" :
                         "What should the agent build?"}
            disabled={isRunning}
            data-testid="agent-input"
          />
          <Button size="sm" className="h-auto px-3" onClick={() => void submit()} disabled={isRunning || !input.trim()} data-testid="agent-send">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Cost meter */}
      <div className="border-t border-border px-3 py-1.5 shrink-0 text-[10px] text-muted-foreground flex items-center gap-3">
        <DollarSign className="w-3 h-3" />
        {activeTask ? (
          <>
            <span>${(activeTask.costUsd ?? 0).toFixed(4)}</span>
            <span>{activeTask.inputTokens.toLocaleString()} in / {activeTask.outputTokens.toLocaleString()} out</span>
            <span className="ml-auto truncate font-mono">{activeTask.model}</span>
          </>
        ) : (
          <span className="text-muted-foreground">No active task</span>
        )}
      </div>
    </div>
  );
}

function Wand() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>;
}

// Suppress unused destructure warning
void ChevronDown;
