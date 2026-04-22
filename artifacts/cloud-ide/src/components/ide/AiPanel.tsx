import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Bot, Send, X, Plus, Trash2, History, Loader2, Copy, Check, Wand2, FilePlus, FileEdit, FileX, ChevronRight, ChevronDown, Sparkles, Cpu, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";

type Role = "user" | "assistant";
interface UsageInfo { inputTokens: number; outputTokens: number; cost: number; latencyMs?: number; modelLabel?: string }
interface ChatMessage { role: Role; content: string; usage?: UsageInfo }

interface MultiModel {
  id: string;
  label: string;
  provider: string;
  description: string;
  pricing: { inputPer1M: number; outputPer1M: number };
  available: boolean;
}
interface CompareResult {
  modelId: string;
  label: string;
  ok: boolean;
  content?: string;
  error?: string;
  usage?: { inputTokens: number; outputTokens: number; cost: number };
  latencyMs?: number;
}
interface Conversation {
  id: string;
  title: string | null;
  messages: ChatMessage[];
  updatedAt: string;
  tokenCount?: { input: number; output: number };
}

type AiMode = "chat" | "build" | "generate" | "debug" | "explain" | "refactor" | "review" | "test" | "architecture";

const MODES: { id: AiMode; label: string; endpoint: string }[] = [
  { id: "chat", label: "Chat", endpoint: "chat" },
  { id: "build", label: "Build", endpoint: "build" },
  { id: "generate", label: "Generate", endpoint: "generate" },
  { id: "debug", label: "Debug", endpoint: "debug" },
  { id: "explain", label: "Explain", endpoint: "explain" },
  { id: "refactor", label: "Refactor", endpoint: "refactor" },
  { id: "review", label: "Review", endpoint: "review" },
  { id: "test", label: "Tests", endpoint: "test" },
  { id: "architecture", label: "Architect", endpoint: "architecture" },
];

export interface BuildFileChange {
  path: string;
  action: "create" | "update" | "delete";
  content?: string;
}
export interface BuildResult {
  summary?: string;
  files: BuildFileChange[];
  commands?: string[];
}

interface Props {
  projectId: string;
  activeFilePath?: string;
  getActiveFileContent: () => string;
  getActiveFileLanguage: () => string;
  getRecentErrors: () => string;
  applyToActiveFile: (code: string) => void;
  insertAtCursor: (code: string) => void;
  applyBuildResult?: (result: BuildResult) => Promise<{ ok: number; failed: number }>;
  onClose: () => void;
}

const apiBase = `${import.meta.env.VITE_API_URL || ""}/api`;

export default function AiPanel({
  projectId,
  activeFilePath,
  getActiveFileContent,
  getActiveFileLanguage,
  getRecentErrors,
  applyToActiveFile,
  insertAtCursor,
  applyBuildResult,
  onClose,
}: Props) {
  const [mode, setMode] = useState<AiMode>("chat");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number; plan: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoScaffold, setAutoScaffold] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [multiModels, setMultiModels] = useState<MultiModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [streamingCost, setStreamingCost] = useState<{ tokens: number; estimatedCost: number; startTime: number } | null>(null);

  useEffect(() => {
    fetch(`${apiBase}/ai/multi/models`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.models) setMultiModels(d.models); })
      .catch(() => {});
  }, []);

  const selectedModel = multiModels.find(m => m.id === selectedModelId) || null;
  const useMultiEndpoint = mode === "chat" && !!selectedModel;

  const fetchConversations = useCallback(() => {
    fetch(`${apiBase}/ai/conversations?projectId=${projectId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((rows: Conversation[]) => setConversations(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [projectId]);

  const fetchUsage = useCallback(() => {
    fetch(`${apiBase}/ai/usage`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(u => u && setUsage(u))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchConversations(); fetchUsage(); }, [fetchConversations, fetchUsage]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages, loading]);

  const loadConversation = (conv: Conversation) => {
    setActiveConvId(conv.id);
    setMessages(Array.isArray(conv.messages) ? conv.messages : []);
    setShowHistory(false);
  };

  const newConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setShowHistory(false);
  };

  const deleteConversation = async (id: string) => {
    await fetch(`${apiBase}/ai/conversations/${id}`, { method: "DELETE", credentials: "include" });
    if (activeConvId === id) newConversation();
    fetchConversations();
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    setError(null);
    const userText = input.trim();
    setInput("");
    setLoading(true);

    const code = getActiveFileContent();
    const language = getActiveFileLanguage();
    const errors = getRecentErrors();

    const modeDef = MODES.find(m => m.id === mode)!;
    const body: Record<string, unknown> = {
      projectId,
      conversationId: activeConvId,
      activeFilePath,
      language,
    };

    if (mode === "chat") {
      body.message = userText;
      body.errors = errors;
    } else if (mode === "generate") {
      body.description = userText;
      body.targetPath = activeFilePath;
    } else if (mode === "debug") {
      body.error = errors || userText;
      body.code = code;
    } else if (mode === "explain") {
      body.code = code || userText;
    } else if (mode === "refactor") {
      body.code = code;
      body.instructions = userText;
    } else if (mode === "review") {
      body.code = code;
      body.scope = code ? "file" : "project";
    } else if (mode === "test") {
      body.code = code;
      body.filename = activeFilePath;
    } else if (mode === "architecture") {
      body.description = userText;
      body.autoScaffold = autoScaffold;
    } else if (mode === "build") {
      body.instruction = userText;
    }

    setMessages(prev => [...prev, { role: "user", content: userText }]);

    try {
      if (useMultiEndpoint && selectedModel) {
        const history: ChatMessage[] = [...messages, { role: "user", content: userText }];
        const res = await fetch(`${apiBase}/ai/multi/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            modelId: selectedModel.id,
            messages: history.map(m => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || `Request failed (${res.status})`);
          setMessages(prev => prev.slice(0, -1));
          return;
        }
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.content || "(empty response)",
          usage: {
            inputTokens: data.usage?.inputTokens ?? 0,
            outputTokens: data.usage?.outputTokens ?? 0,
            cost: data.usage?.cost ?? 0,
            latencyMs: data.latencyMs,
            modelLabel: data.label || selectedModel.label,
          },
        }]);
        return;
      }
      if (mode === "chat") {
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);
        const inputTokenEstimate = Math.ceil(userText.length / 4);
        const outputCostPer1k = selectedModel?.pricing?.outputPer1M ? selectedModel.pricing.outputPer1M / 1000 : 0.002;
        const inputCostPer1k = selectedModel?.pricing?.inputPer1M ? selectedModel.pricing.inputPer1M / 1000 : 0.0005;
        const inputCostEstimate = (inputTokenEstimate / 1000) * inputCostPer1k;
        setStreamingCost({ tokens: 0, estimatedCost: inputCostEstimate, startTime: Date.now() });
        const res = await fetch(`${apiBase}/ai/${modeDef.endpoint}?stream=1`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) {
          const errBody = await res.json().catch(() => ({}));
          if (res.status === 429) setError(`Daily limit reached (${errBody.used}/${errBody.limit}).`);
          else setError(errBody.error || `Request failed (${res.status})`);
          setMessages(prev => prev.slice(0, -2));
          setStreamingCost(null);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let acc = "";
        let totalOutputTokens = 0;
        let convId: string | undefined;
        let finalUsage: UsageInfo | undefined;
        outer: while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split(/\n\n/);
          buffer = events.pop() || "";
          for (const ev of events) {
            const lines = ev.split("\n");
            let eventType = "message";
            let dataStr = "";
            for (const ln of lines) {
              if (ln.startsWith("event:")) eventType = ln.slice(6).trim();
              else if (ln.startsWith("data:")) dataStr += ln.slice(5).trim();
            }
            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (eventType === "delta" && typeof parsed.text === "string") {
                acc += parsed.text;
                const chunkTokens = Math.ceil(parsed.text.length / 4);
                totalOutputTokens += chunkTokens;
                const runningCost = inputCostEstimate + (totalOutputTokens / 1000) * outputCostPer1k;
                setStreamingCost({ tokens: totalOutputTokens, estimatedCost: runningCost, startTime: Date.now() });
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: acc };
                  return copy;
                });
              } else if (eventType === "done") {
                if (parsed.conversationId) convId = parsed.conversationId;
                if (parsed.usage) {
                  finalUsage = {
                    inputTokens: parsed.usage.inputTokens ?? inputTokenEstimate,
                    outputTokens: parsed.usage.outputTokens ?? totalOutputTokens,
                    cost: parsed.usage.cost ?? (inputCostEstimate + (totalOutputTokens / 1000) * outputCostPer1k),
                    latencyMs: parsed.latencyMs,
                    modelLabel: parsed.model || selectedModel?.label,
                  };
                }
                break outer;
              } else if (eventType === "error") {
                setError(parsed.error || "Stream error");
                break outer;
              }
            } catch {}
          }
        }
        const streamEnd = Date.now();
        const computedUsage: UsageInfo = finalUsage || {
          inputTokens: inputTokenEstimate,
          outputTokens: totalOutputTokens,
          cost: inputCostEstimate + (totalOutputTokens / 1000) * outputCostPer1k,
          latencyMs: streamEnd - (streamingCost?.startTime ?? streamEnd),
          modelLabel: selectedModel?.label || "Default",
        };
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], usage: computedUsage };
          return copy;
        });
        setStreamingCost(null);
        if (convId) { setActiveConvId(convId); fetchConversations(); }
        fetchUsage();
        return;
      }
      const res = await fetch(`${apiBase}/ai/${modeDef.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(`Daily limit reached (${errBody.used}/${errBody.limit}). Upgrade your plan for more.`);
        } else {
          setError(errBody.error || `Request failed (${res.status})`);
        }
        setMessages(prev => prev.slice(0, -1));
        return;
      }
      const data = await res.json();
      let content = data.content;
      if (mode === "architecture" && data.plan) {
        content = "```json\n" + JSON.stringify(data.plan, null, 2) + "\n```";
        if (Array.isArray(data.scaffolded) && data.scaffolded.length) {
          content += `\n\n_Scaffolded ${data.scaffolded.length} files._`;
        }
      }
      if (mode === "build" && typeof content === "string") {
        const parsed = parseBuildJson(content);
        if (parsed) {
          content = `__BUILD__${JSON.stringify(parsed)}`;
        }
      }
      setMessages(prev => [...prev, { role: "assistant", content: content || "(empty response)" }]);
      if (data.conversationId) {
        setActiveConvId(data.conversationId);
        fetchConversations();
      }
      fetchUsage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      setStreamingCost(null);
    }
  };

  return (
    <div className="absolute right-0 top-11 bottom-0 w-[420px] border-l border-border/50 bg-card flex flex-col z-50" data-testid="ai-chat-panel">
      <div className="h-9 flex items-center justify-between px-3 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">AI Assistant</span>
          {usage && (
            <span className="text-[10px] text-muted-foreground ml-1" data-testid="ai-usage">
              {usage.used}/{usage.limit}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <div className="relative">
            <button
              onClick={() => setShowModelMenu(v => !v)}
              className="flex items-center gap-1 px-1.5 h-6 rounded text-[10px] bg-muted/40 hover:bg-muted text-foreground"
              title="Choose AI model"
              data-testid="button-ai-model"
            >
              <Cpu className="w-3 h-3 text-primary" />
              <span className="max-w-[80px] truncate">{selectedModel?.label || "Default"}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {showModelMenu && (
              <div className="absolute right-0 top-7 w-72 z-50 bg-popover border border-border rounded-md shadow-lg p-1" data-testid="ai-model-menu">
                <button
                  onClick={() => { setSelectedModelId(null); setShowModelMenu(false); }}
                  className={`w-full text-left px-2 py-1.5 rounded text-[11px] hover:bg-accent/40 ${!selectedModelId ? "bg-accent/30" : ""}`}
                >
                  <div className="font-medium">Default (streaming)</div>
                  <div className="text-[10px] text-muted-foreground">Server-managed model with SSE streaming.</div>
                </button>
                <div className="h-px bg-border my-1" />
                {multiModels.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModelId(m.id); setShowModelMenu(false); }}
                    disabled={!m.available}
                    className={`w-full text-left px-2 py-1.5 rounded text-[11px] flex items-start justify-between gap-2 ${selectedModelId === m.id ? "bg-accent/30" : "hover:bg-accent/40"} ${!m.available ? "opacity-50 cursor-not-allowed" : ""}`}
                    data-testid={`ai-model-option-${m.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{m.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{m.description}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">
                        ${m.pricing.inputPer1M.toFixed(2)}/1M in · ${m.pricing.outputPer1M.toFixed(2)}/1M out
                      </div>
                    </div>
                    {!m.available && <span className="text-[9px] uppercase text-amber-400 shrink-0">no key</span>}
                  </button>
                ))}
                <div className="h-px bg-border my-1" />
                <button
                  onClick={() => { setShowModelMenu(false); setShowCompare(true); }}
                  className="w-full text-left px-2 py-1.5 rounded text-[11px] hover:bg-accent/40 flex items-center gap-1.5"
                  data-testid="button-open-compare"
                >
                  <GitCompareArrows className="w-3 h-3" /> Compare models side-by-side…
                </button>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="History" onClick={() => setShowHistory(v => !v)} data-testid="button-ai-history">
            <History className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="New chat" onClick={newConversation} data-testid="button-ai-new">
            <Plus className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {showCompare && (
        <CompareDialog
          models={multiModels}
          onClose={() => setShowCompare(false)}
        />
      )}

      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/30 overflow-x-auto shrink-0">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`text-[10px] px-2 py-0.5 rounded ${mode === m.id ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}
            data-testid={`ai-mode-${m.id}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "architecture" && (
        <label className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/30 text-[11px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={autoScaffold}
            onChange={(e) => setAutoScaffold(e.target.checked)}
            className="h-3 w-3"
            data-testid="checkbox-auto-scaffold"
          />
          Auto-scaffold files into project
        </label>
      )}

      {showHistory && (
        <div className="border-b border-border/30 max-h-64 overflow-y-auto">
          {conversations.length === 0 && (
            <div className="text-[11px] text-muted-foreground text-center py-4">No conversations yet</div>
          )}
          {conversations.map(c => (
            <div key={c.id} className={`flex items-center justify-between px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/40 ${activeConvId === c.id ? "bg-primary/10" : ""}`} onClick={() => loadConversation(c)} data-testid={`conversation-${c.id}`}>
              <span className="truncate flex-1">{c.title || "Untitled"}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }} className="opacity-50 hover:opacity-100">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p>Mode: <strong className="text-foreground">{MODES.find(m => m.id === mode)?.label}</strong></p>
            <p className="mt-1 opacity-70">{modeHint(mode)}</p>
          </div>
        )}
        {messages.map((msg, i) => {
          if (msg.role === "assistant" && msg.content.startsWith("__BUILD__")) {
            try {
              const result = JSON.parse(msg.content.slice(9)) as BuildResult;
              return <BuildResultCard key={i} result={result} onApply={applyBuildResult} />;
            } catch {}
          }
          return (
            <MessageBubble
              key={i}
              message={msg}
              onApply={applyToActiveFile}
              onInsert={insertAtCursor}
            />
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> Thinking...
            </div>
          </div>
        )}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded px-2 py-1.5" data-testid="ai-error">{error}</div>
        )}
      </div>

      {streamingCost && (
        <div className="px-3 py-1.5 border-t border-border/30 bg-gradient-to-r from-emerald-500/5 to-blue-500/5" data-testid="live-cost-ticker">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-muted-foreground">Generating</span>
              <span className="font-mono text-emerald-400">{streamingCost.tokens.toLocaleString()} tokens</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Cost:</span>
              <span className="font-mono font-bold text-emerald-400 tabular-nums" style={{ minWidth: "65px", textAlign: "right" }}>
                ${streamingCost.estimatedCost.toFixed(6)}
              </span>
            </div>
          </div>
          <div className="mt-1 h-0.5 bg-muted/30 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full animate-pulse" style={{ width: `${Math.min(100, (streamingCost.tokens / 40) * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="p-2 border-t border-border/30">
        <div className="flex items-center gap-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            className="flex-1 bg-muted/30 border border-border/50 rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50 resize-none"
            placeholder={inputPlaceholder(mode)}
            data-testid="input-ai-chat"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={send} disabled={!input.trim() || loading} data-testid="button-ai-send">
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function modeHint(mode: AiMode): string {
  switch (mode) {
    case "chat": return "Ask anything about your project.";
    case "build": return "Describe a feature — AI plans & writes multiple files. Review and Apply.";
    case "generate": return "Describe code to generate.";
    case "debug": return "Paste an error or use recent terminal errors.";
    case "explain": return "Explains the active file.";
    case "refactor": return "Describe how to refactor the active file.";
    case "review": return "Reviews the active file or whole project.";
    case "test": return "Generates tests for the active file.";
    case "architecture": return "Describe the system to architect (returns JSON plan).";
  }
}

function inputPlaceholder(mode: AiMode): string {
  switch (mode) {
    case "chat": return "Ask AI...";
    case "build": return "Add a dark mode toggle to the navbar...";
    case "generate": return "Generate a function that...";
    case "debug": return "What's wrong? (uses errors/code)";
    case "explain": return "Optional notes (uses active file)";
    case "refactor": return "How should this be refactored?";
    case "review": return "Optional focus (uses active file)";
    case "test": return "Optional notes (uses active file)";
    case "architecture": return "Describe what to build...";
  }
}

function parseBuildJson(text: string): BuildResult | null {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(s.slice(start, end + 1));
    if (parsed && Array.isArray(parsed.files)) return parsed as BuildResult;
  } catch {}
  return null;
}

function BuildResultCard({ result, onApply }: { result: BuildResult; onApply?: (r: BuildResult) => Promise<{ ok: number; failed: number }> }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<{ ok: number; failed: number } | null>(null);
  const toggle = (i: number) => setExpanded(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const handleApply = async () => {
    if (!onApply) return;
    setApplying(true);
    try { setApplied(await onApply(result)); } finally { setApplying(false); }
  };
  const iconFor = (a: string) => a === "create" ? <FilePlus className="w-3 h-3 text-green-400" /> : a === "delete" ? <FileX className="w-3 h-3 text-red-400" /> : <FileEdit className="w-3 h-3 text-blue-400" />;
  return (
    <div className="bg-muted/40 border border-primary/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="font-semibold">Build Plan · {result.files.length} file{result.files.length !== 1 ? "s" : ""}</span>
      </div>
      {result.summary && <div className="text-[11px] text-muted-foreground">{result.summary}</div>}
      <div className="space-y-1">
        {result.files.map((f, i) => (
          <div key={i} className="border border-border/40 rounded">
            <button onClick={() => toggle(i)} className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] hover:bg-accent/30">
              {expanded.has(i) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {iconFor(f.action)}
              <span className="font-mono truncate flex-1 text-left">{f.path}</span>
              <span className="text-[9px] uppercase text-muted-foreground">{f.action}</span>
            </button>
            {expanded.has(i) && f.content && (
              <pre className="bg-background/60 text-[10px] p-2 overflow-auto max-h-60 font-mono whitespace-pre">{f.content}</pre>
            )}
          </div>
        ))}
      </div>
      {result.commands && result.commands.length > 0 && (
        <div className="text-[10px] text-muted-foreground">
          <div className="font-semibold mb-0.5">Suggested commands:</div>
          {result.commands.map((c, i) => <div key={i} className="font-mono bg-background/40 px-1.5 py-0.5 rounded">{c}</div>)}
        </div>
      )}
      {applied ? (
        <div className={`text-[11px] px-2 py-1 rounded ${applied.failed ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"}`}>
          ✓ Applied {applied.ok} file{applied.ok !== 1 ? "s" : ""}{applied.failed ? ` · ${applied.failed} failed` : ""}
        </div>
      ) : (
        <Button size="sm" className="w-full h-7 text-xs gap-1" onClick={handleApply} disabled={applying || !onApply}>
          {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
          {applying ? "Applying..." : "Apply All Changes"}
        </Button>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onApply,
  onInsert,
}: {
  message: ChatMessage;
  onApply: (code: string) => void;
  onInsert: (code: string) => void;
}) {
  const isUser = message.role === "user";
  const u = message.usage;
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[95%] rounded-lg px-3 py-2 text-xs ${isUser ? "bg-primary/20 text-foreground" : "bg-muted/50 text-foreground w-full"}`}>
        {!isUser && u && (
          <div className="flex items-center gap-1.5 text-[9.5px] text-muted-foreground mb-1.5 pb-1.5 border-b border-border/30" data-testid="message-usage">
            {u.modelLabel && <span className="font-semibold text-foreground/80">{u.modelLabel}</span>}
            <span>·</span>
            <span>{u.inputTokens.toLocaleString()} in</span>
            <span>·</span>
            <span>{u.outputTokens.toLocaleString()} out</span>
            <span>·</span>
            <span className="text-emerald-400">${u.cost.toFixed(5)}</span>
            {typeof u.latencyMs === "number" && <><span>·</span><span>{(u.latencyMs / 1000).toFixed(2)}s</span></>}
          </div>
        )}
        {isUser ? (
          <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
        ) : (
          <ReactMarkdown
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre({ children }) {
                return <CodeBlock onApply={onApply} onInsert={onInsert}>{children}</CodeBlock>;
              },
              code({ className, children, ...rest }) {
                const isInline = !/language-/.test(className || "");
                if (isInline) return <code className="bg-background/60 px-1 rounded text-[11px]">{children}</code>;
                return <code className={className} {...rest}>{children}</code>;
              },
              p({ children }) { return <p className="mb-2 last:mb-0">{children}</p>; },
              ul({ children }) { return <ul className="list-disc pl-4 mb-2">{children}</ul>; },
              ol({ children }) { return <ol className="list-decimal pl-4 mb-2">{children}</ol>; },
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ children, onApply, onInsert }: { children: React.ReactNode; onApply: (code: string) => void; onInsert: (code: string) => void }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLPreElement | null>(null);

  const getCode = (): string => ref.current?.querySelector("code")?.textContent || "";
  const handleCopy = () => {
    const code = getCode();
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  const handleApply = () => onApply(getCode());
  const handleInsert = () => onInsert(getCode());

  return (
    <div className="relative my-2 group">
      <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={handleCopy} className="bg-background/80 hover:bg-background border border-border rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1" title="Copy" data-testid="button-code-copy">
          {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button onClick={handleInsert} className="bg-background/80 hover:bg-background border border-border rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1" title="Insert at cursor" data-testid="button-code-insert">
          Insert
        </button>
        <button onClick={handleApply} className="bg-primary/80 hover:bg-primary text-primary-foreground border border-primary rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1" title="Apply (replace file)" data-testid="button-code-apply">
          <Wand2 className="w-2.5 h-2.5" /> Apply
        </button>
      </div>
      <pre ref={ref} className="bg-background/80 rounded p-2 overflow-x-auto text-[11px] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function CompareDialog({ models, onClose }: { models: MultiModel[]; onClose: () => void }) {
  const available = models.filter(m => m.available);
  const [prompt, setPrompt] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set(available.slice(0, 3).map(m => m.id)));
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CompareResult[] | null>(null);

  const togglePick = (id: string) => setPicked(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const run = async () => {
    if (!prompt.trim() || picked.size === 0) return;
    setRunning(true);
    setResults(null);
    try {
      const res = await fetch(`${apiBase}/ai/multi/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          modelIds: Array.from(picked),
          messages: [{ role: "user", content: prompt.trim() }],
        }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      setResults([{ modelId: "err", label: "Error", ok: false, error: e instanceof Error ? e.message : "Network error" }]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={onClose} data-testid="ai-compare-dialog">
      <div className="bg-card border border-border rounded-lg w-full max-w-5xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Compare AI Models</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
        </div>
        <div className="p-4 space-y-3 border-b border-border">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask the same question to multiple models…"
            rows={3}
            className="w-full bg-muted/30 border border-border/50 rounded px-2.5 py-2 text-sm outline-none focus:border-primary/50 resize-none"
            data-testid="input-compare-prompt"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {models.map(m => (
              <button
                key={m.id}
                disabled={!m.available}
                onClick={() => togglePick(m.id)}
                className={`text-[11px] px-2 py-1 rounded border ${
                  picked.has(m.id) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border/60 hover:bg-muted"
                } ${!m.available ? "opacity-40 cursor-not-allowed" : ""}`}
                title={m.available ? m.description : "Provider key not configured"}
                data-testid={`compare-pick-${m.id}`}
              >
                {m.label}
              </button>
            ))}
            <div className="flex-1" />
            <Button size="sm" className="h-7 text-xs gap-1" onClick={run} disabled={running || !prompt.trim() || picked.size === 0} data-testid="button-run-compare">
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {running ? "Running…" : `Run on ${picked.size} model${picked.size === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {!results && !running && (
            <div className="text-center text-muted-foreground text-sm py-12">
              Pick 2 or more models, type a prompt, and run.
            </div>
          )}
          {running && (
            <div className="text-center text-muted-foreground text-sm py-12 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Querying {picked.size} model{picked.size === 1 ? "" : "s"} in parallel…
            </div>
          )}
          {results && (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(results.length, 3)}, minmax(0, 1fr))` }}>
              {results.map(r => (
                <div key={r.modelId} className="border border-border rounded-md flex flex-col" data-testid={`compare-result-${r.modelId}`}>
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-semibold">{r.label}</span>
                    {r.ok && r.usage && (
                      <span className="text-[10px] text-emerald-400">${r.usage.cost.toFixed(5)}</span>
                    )}
                  </div>
                  {r.ok ? (
                    <>
                      <div className="px-3 py-3 text-xs overflow-auto max-h-80 prose-invert">
                        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{r.content || ""}</ReactMarkdown>
                      </div>
                      <div className="px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>{r.usage?.inputTokens.toLocaleString()} in · {r.usage?.outputTokens.toLocaleString()} out</span>
                        {typeof r.latencyMs === "number" && <span>{(r.latencyMs / 1000).toFixed(2)}s</span>}
                      </div>
                    </>
                  ) : (
                    <div className="px-3 py-3 text-xs text-destructive">{r.error}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
