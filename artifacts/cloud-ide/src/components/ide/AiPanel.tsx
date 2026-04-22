import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Bot, Send, X, Plus, Trash2, History, Loader2, Copy, Check, Wand2, FilePlus, FileEdit, FileX, ChevronRight, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Role = "user" | "assistant";
interface ChatMessage { role: Role; content: string }
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
      if (mode === "chat") {
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);
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
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let acc = "";
        let convId: string | undefined;
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
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: acc };
                  return copy;
                });
              } else if (eventType === "done") {
                if (parsed.conversationId) convId = parsed.conversationId;
                break outer;
              } else if (eventType === "error") {
                setError(parsed.error || "Stream error");
                break outer;
              }
            } catch {}
          }
        }
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
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[95%] rounded-lg px-3 py-2 text-xs ${isUser ? "bg-primary/20 text-foreground" : "bg-muted/50 text-foreground w-full"}`}>
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
