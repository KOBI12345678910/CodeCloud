import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Sparkles, Send, Code2, Eye, Loader2, ArrowLeft,
  Copy, Check, Download, Smartphone, Tablet, Monitor,
  RefreshCw, ExternalLink, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  html?: string;
}

interface BuildState {
  id: string;
  prompt: string;
  createdAt: number;
  preview?: string;
  history?: ChatMessage[];
}

const BUILDS_KEY = "buildhub:projects";
const STATE_PREFIX = "buildhub:state:";

const apiBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

function loadBuild(id: string): BuildState | null {
  try {
    const raw = localStorage.getItem(STATE_PREFIX + id);
    if (raw) return JSON.parse(raw);
  } catch {}
  try {
    const list = JSON.parse(localStorage.getItem(BUILDS_KEY) || "[]");
    const b = Array.isArray(list) ? list.find((x: any) => x.id === id) : null;
    return b ?? null;
  } catch {
    return null;
  }
}

function persistBuild(state: BuildState) {
  try {
    localStorage.setItem(STATE_PREFIX + state.id, JSON.stringify(state));
    const list = JSON.parse(localStorage.getItem(BUILDS_KEY) || "[]");
    if (Array.isArray(list)) {
      const idx = list.findIndex((x: any) => x.id === state.id);
      const summary = {
        id: state.id,
        prompt: state.prompt,
        createdAt: state.createdAt,
        preview: state.preview?.slice(0, 200),
      };
      if (idx >= 0) list[idx] = summary;
      else list.unshift(summary);
      localStorage.setItem(BUILDS_KEY, JSON.stringify(list.slice(0, 30)));
    }
  } catch {}
}

function extractHtml(text: string): string | null {
  const fenceMatch = text.match(/```(?:html)?\s*\n([\s\S]*?)(?:```|$)/i);
  if (fenceMatch) return fenceMatch[1].trim();
  if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
    return text.trim();
  }
  return null;
}

interface Props {
  id: string;
}

export default function BuildHubWorkspace({ id }: Props) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [state, setState] = useState<BuildState | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentHtml, setCurrentHtml] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [view, setView] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // load
  useEffect(() => {
    const s = loadBuild(id);
    if (!s) {
      navigate("/build");
      return;
    }
    setState(s);
    if (s.history && s.history.length > 0) {
      setHistory(s.history);
      const last = [...s.history].reverse().find((m) => m.role === "assistant" && m.html);
      if (last?.html) setCurrentHtml(last.html);
    }
  }, [id, navigate]);

  // auto-start initial generation if no history yet
  useEffect(() => {
    if (!state || startedRef.current) return;
    if (history.length === 0) {
      startedRef.current = true;
      void runGeneration(state.prompt, []);
    }
  }, [state, history.length]);

  // scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.length, streamBuffer]);

  async function runGeneration(prompt: string, prevHistory: ChatMessage[]) {
    setError(null);
    setStreaming(true);
    setStreamBuffer("");
    const userMsg: ChatMessage = { role: "user", content: prompt };
    const baseHistory = [...prevHistory, userMsg];
    setHistory(baseHistory);

    try {
      const res = await fetch(`${apiBase}/api/buildhub/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt,
          history: prevHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Server error (${res.status})${txt ? `: ${txt.slice(0, 200)}` : ""}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim());
            if (payload.delta) {
              assistantText += payload.delta;
              setStreamBuffer(assistantText);
              const html = extractHtml(assistantText);
              if (html) setCurrentHtml(html);
            } else if (payload.error) {
              throw new Error(payload.error);
            }
          } catch (e) {
            if (e instanceof Error && e.message) throw e;
          }
        }
      }

      const finalHtml = extractHtml(assistantText) || "";
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: assistantText,
        html: finalHtml || undefined,
      };
      const newHistory = [...baseHistory, assistantMsg];
      setHistory(newHistory);
      setStreamBuffer("");
      if (finalHtml) setCurrentHtml(finalHtml);

      if (state) {
        const next: BuildState = {
          ...state,
          history: newHistory,
          preview: finalHtml ? finalHtml.slice(0, 500) : state.preview,
        };
        setState(next);
        persistBuild(next);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setError(msg);
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
    } finally {
      setStreaming(false);
    }
  }

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = followUp.trim();
    if (!trimmed || streaming) return;
    setFollowUp("");
    void runGeneration(trimmed, history);
  };

  const handleCopy = async () => {
    if (!currentHtml) return;
    try {
      await navigator.clipboard.writeText(currentHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!currentHtml) return;
    const blob = new Blob([currentHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buildhub-${id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenNewTab = () => {
    if (!currentHtml) return;
    const blob = new Blob([currentHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const deviceWidth = useMemo(() => {
    if (device === "mobile") return 390;
    if (device === "tablet") return 820;
    return undefined;
  }, [device]);

  if (!state) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
      {/* TOP BAR */}
      <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#0d0d14]/80 backdrop-blur px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/build"
            className="text-white/60 hover:text-white transition flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">BuildHub</span>
          </Link>
          <div className="h-5 w-px bg-white/10" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm text-white/80 truncate max-w-[280px] md:max-w-md">
              {state.prompt}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streaming && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-purple-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              Building…
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            disabled={!currentHtml}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            disabled={!currentHtml}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleOpenNewTab}
            disabled={!currentHtml}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* CHAT PANEL */}
        <aside className="w-full md:w-[380px] lg:w-[420px] flex flex-col border-r border-white/10 bg-[#0c0c12]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.map((m, i) => (
              <ChatBubble key={i} msg={m} />
            ))}
            {streaming && streamBuffer && (
              <ChatBubble
                msg={{ role: "assistant", content: streamBuffer }}
                streaming
              />
            )}
            {streaming && !streamBuffer && (
              <div className="flex items-center gap-2 text-xs text-white/50 pl-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking…
              </div>
            )}
            {error && !streaming && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 break-words">{error}</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form
            onSubmit={handleSend}
            className="border-t border-white/10 p-3 bg-[#0a0a10]"
          >
            <div className="relative">
              <textarea
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  streaming
                    ? "Generating…"
                    : "Ask for changes — e.g. 'make the hero darker'"
                }
                disabled={streaming}
                rows={2}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-500/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={streaming || !followUp.trim()}
                className="absolute right-2 bottom-2 p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/30 transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </aside>

        {/* PREVIEW / CODE */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0f]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 bg-[#0d0d14]">
            <div className="flex items-center gap-1 rounded-lg bg-white/[0.05] p-1">
              <button
                onClick={() => setView("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  view === "preview"
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              <button
                onClick={() => setView("code")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  view === "code"
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Code
              </button>
            </div>

            {view === "preview" && (
              <div className="flex items-center gap-1 rounded-lg bg-white/[0.05] p-1">
                {([
                  ["mobile", Smartphone],
                  ["tablet", Tablet],
                  ["desktop", Monitor],
                ] as const).map(([d, Icon]) => (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    className={`p-1.5 rounded-md transition ${
                      device === d
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:text-white"
                    }`}
                    aria-label={d}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            )}

            {view === "preview" && currentHtml && (
              <button
                onClick={() => setCurrentHtml((h) => h + " ")}
                className="text-white/50 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition"
                aria-label="Refresh"
                title="Refresh preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4 min-h-0">
            {view === "preview" ? (
              currentHtml ? (
                <div className="h-full w-full flex justify-center">
                  <div
                    className="bg-white rounded-lg shadow-2xl overflow-hidden h-full transition-all"
                    style={{
                      width: deviceWidth ? `${deviceWidth}px` : "100%",
                      maxWidth: "100%",
                    }}
                  >
                    <iframe
                      title="preview"
                      srcDoc={currentHtml}
                      sandbox="allow-scripts allow-same-origin allow-forms"
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              ) : (
                <EmptyPreview streaming={streaming} />
              )
            ) : (
              <pre className="text-xs leading-relaxed font-mono text-white/80 bg-[#08080c] rounded-lg p-4 overflow-auto h-full">
                <code>{currentHtml || "// no code yet"}</code>
              </pre>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function EmptyPreview({ streaming }: { streaming: boolean }) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          {streaming ? (
            <Loader2 className="w-7 h-7 text-purple-300 animate-spin" />
          ) : (
            <Sparkles className="w-7 h-7 text-purple-300" />
          )}
        </div>
        <p className="mt-4 text-sm text-white/60">
          {streaming ? "Building your app…" : "Your app will appear here"}
        </p>
      </div>
    </div>
  );
}

function ChatBubble({ msg, streaming }: { msg: ChatMessage; streaming?: boolean }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-purple-500 to-pink-500 px-3.5 py-2.5 text-sm text-white shadow-lg shadow-purple-500/20">
          {msg.content}
        </div>
      </div>
    );
  }
  // assistant
  const summary = streaming
    ? "Generating HTML…"
    : msg.html
      ? "Updated the app — check the preview."
      : msg.content.replace(/```[\s\S]*?```/g, "").trim() || "Done.";
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-purple-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/50 mb-1">BuildHub AI</div>
        <div className="rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm text-white/85">
          {summary}
          {streaming && (
            <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-400 animate-pulse align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
