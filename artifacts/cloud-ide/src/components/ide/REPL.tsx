import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Terminal, ChevronRight, Trash2, X, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReplLanguage = "nodejs" | "python" | "ruby";

interface HistoryEntry {
  id: string;
  language: ReplLanguage;
  code: string;
  output: string;
  error: string;
  exitCode: number;
  duration: number;
  timestamp: number;
}

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

const LANG_CONFIG: Record<ReplLanguage, { label: string; prompt: string; color: string; bg: string }> = {
  nodejs: { label: "Node.js", prompt: ">", color: "#68a063", bg: "rgba(104,160,99,0.1)" },
  python: { label: "Python", prompt: ">>>", color: "#3572A5", bg: "rgba(53,114,165,0.1)" },
  ruby: { label: "Ruby", prompt: "irb>", color: "#CC342D", bg: "rgba(204,52,45,0.1)" },
};

export function REPL({ onClose }: { onClose: () => void }) {
  const [language, setLanguage] = useState<ReplLanguage>("nodejs");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const config = LANG_CONFIG[language];

  const execute = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`${API}/repl/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ language, code }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Execution failed");
      }
      return res.json();
    },
    onSuccess: (result, code) => {
      setHistory(prev => [...prev, {
        id: Math.random().toString(36).substring(2, 10),
        language,
        code,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        duration: result.duration,
        timestamp: Date.now(),
      }]);
      setInput("");
      setHistoryIndex(-1);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
    },
    onError: (err: Error, code) => {
      setHistory(prev => [...prev, {
        id: Math.random().toString(36).substring(2, 10),
        language,
        code,
        output: "",
        error: err.message,
        exitCode: 1,
        duration: 0,
        timestamp: Date.now(),
      }]);
      setInput("");
      setHistoryIndex(-1);
    },
  });

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || execute.isPending) return;

    if (trimmed === "clear" || trimmed === "cls") {
      setHistory([]);
      setInput("");
      return;
    }

    execute.mutate(trimmed);
  }, [input, execute]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const codeHistory = history.filter(h => h.language === language).map(h => h.code);
      if (codeHistory.length === 0) return;
      const newIndex = historyIndex === -1 ? codeHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(codeHistory[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const codeHistory = history.filter(h => h.language === language).map(h => h.code);
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= codeHistory.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(newIndex);
        setInput(codeHistory[newIndex]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  }, [handleSubmit, history, historyIndex, language]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [language]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#0d1117] font-mono" data-testid="repl-panel">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-green-500" />
          <span className="text-[10px] font-medium text-white/80">REPL</span>
          <div className="flex items-center gap-0.5 ml-1">
            {(Object.keys(LANG_CONFIG) as ReplLanguage[]).map(lang => (
              <Button
                key={lang}
                size="sm"
                variant="ghost"
                className={`h-6 px-2 text-[10px] rounded ${
                  language === lang
                    ? "text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
                style={language === lang ? { backgroundColor: LANG_CONFIG[lang].bg, color: LANG_CONFIG[lang].color } : {}}
                onClick={() => { setLanguage(lang); setHistoryIndex(-1); }}
              >
                {LANG_CONFIG[lang].label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/40 hover:text-white/70"
            onClick={clearHistory} title="Clear (Ctrl+L)">
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/40 hover:text-white/70"
            onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1" onClick={() => inputRef.current?.focus()}>
        {history.length === 0 && (
          <div className="text-white/20 text-[11px] py-2">
            <p>{config.label} REPL — Type expressions and press Enter to evaluate</p>
            <p className="mt-1">Type "clear" to clear history | ↑↓ to navigate history | Ctrl+L to clear</p>
          </div>
        )}

        {history.map(entry => (
          <div key={entry.id} className="group">
            <div className="flex items-start gap-2">
              <span className="text-[11px] shrink-0 select-none" style={{ color: LANG_CONFIG[entry.language]?.color || "#6b7280" }}>
                {LANG_CONFIG[entry.language]?.prompt || ">"}
              </span>
              <span className="text-[11px] text-white/90 whitespace-pre-wrap break-all">{entry.code}</span>
              <span className="ml-auto text-[9px] text-white/15 opacity-0 group-hover:opacity-100 shrink-0 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {entry.duration}ms
              </span>
            </div>
            {entry.output && (
              <div className="flex items-start gap-2 ml-0">
                <span className="text-[11px] text-white/30 shrink-0 select-none">
                  {entry.exitCode === 0 ? "←" : "✗"}
                </span>
                <pre className={`text-[11px] whitespace-pre-wrap break-all ${
                  entry.exitCode === 0 ? "text-green-400/80" : "text-red-400/80"
                }`}>{entry.output}</pre>
              </div>
            )}
            {entry.error && (
              <div className="flex items-start gap-2 ml-0">
                <span className="text-[11px] text-red-400/50 shrink-0 select-none">✗</span>
                <pre className="text-[11px] text-red-400/80 whitespace-pre-wrap break-all">{entry.error}</pre>
              </div>
            )}
          </div>
        ))}

        {execute.isPending && (
          <div className="flex items-center gap-2 text-[11px] text-white/30">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            Executing...
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] shrink-0 select-none" style={{ color: config.color }}>
            {config.prompt}
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); setHistoryIndex(-1); }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-[11px] text-white/90 outline-none placeholder:text-white/20 font-mono"
            placeholder={`Type ${config.label} expression...`}
            disabled={execute.isPending}
            autoComplete="off"
            spellCheck={false}
          />
          {input.trim() && (
            <span className="text-[9px] text-white/20">Enter ↵</span>
          )}
        </div>
      </div>
    </div>
  );
}
