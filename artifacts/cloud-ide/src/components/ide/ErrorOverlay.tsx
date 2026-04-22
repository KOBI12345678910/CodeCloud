import { useState, useCallback, useMemo } from "react";
import {
  X, AlertCircle, Sparkles, Copy, Check, ChevronDown,
  ChevronRight, FileCode, ExternalLink, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RuntimeError {
  id: string;
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  timestamp: Date;
  type?: "runtime" | "syntax" | "network" | "unhandled";
}

interface StackFrame {
  functionName: string;
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  isApp: boolean;
}

function parseStackTrace(stack: string): StackFrame[] {
  const lines = stack.split("\n").filter((l) => l.trim().startsWith("at "));
  return lines.map((line) => {
    const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
    if (match) {
      return {
        functionName: match[1],
        fileName: match[2],
        lineNumber: parseInt(match[3], 10),
        columnNumber: parseInt(match[4], 10),
        isApp: !match[2].includes("node_modules"),
      };
    }
    const simpleMatch = line.match(/at\s+(.+):(\d+):(\d+)/);
    if (simpleMatch) {
      return {
        functionName: "(anonymous)",
        fileName: simpleMatch[1],
        lineNumber: parseInt(simpleMatch[2], 10),
        columnNumber: parseInt(simpleMatch[3], 10),
        isApp: !simpleMatch[1].includes("node_modules"),
      };
    }
    return {
      functionName: line.replace(/^\s*at\s+/, "").trim(),
      fileName: "",
      lineNumber: 0,
      columnNumber: 0,
      isApp: false,
    };
  });
}

const ERROR_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  runtime: { label: "Runtime Error", color: "text-red-400", bg: "bg-red-500/10" },
  syntax: { label: "Syntax Error", color: "text-orange-400", bg: "bg-orange-500/10" },
  network: { label: "Network Error", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  unhandled: { label: "Unhandled Rejection", color: "text-red-400", bg: "bg-red-500/10" },
};

interface ErrorOverlayProps {
  errors: RuntimeError[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onFixWithAI?: (error: RuntimeError) => void;
  onGoToFile?: (file: string, line: number, column: number) => void;
  onReload?: () => void;
}

export default function ErrorOverlay({
  errors,
  onDismiss,
  onDismissAll,
  onFixWithAI,
  onGoToFile,
  onReload,
}: ErrorOverlayProps) {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(
    new Set(errors.length > 0 ? [errors[0].id] : [])
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllFrames, setShowAllFrames] = useState<Record<string, boolean>>({});

  const toggleExpand = useCallback((id: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const copyError = useCallback((error: RuntimeError) => {
    const text = `${error.message}\n\n${error.stack || "No stack trace"}`;
    navigator.clipboard.writeText(text);
    setCopiedId(error.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  if (errors.length === 0) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 my-8">
        <div className="bg-[#1a1a2e] border border-red-500/30 rounded-lg shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-red-500/10 border-b border-red-500/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-sm font-semibold text-red-300">
                {errors.length} {errors.length === 1 ? "Error" : "Errors"} Detected
              </span>
            </div>
            <div className="flex items-center gap-1">
              {onReload && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={onReload}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reload
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={onDismissAll}
              >
                Dismiss All
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={onDismissAll}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto divide-y divide-border/20">
            {errors.map((error) => {
              const isExpanded = expandedErrors.has(error.id);
              const typeConfig = ERROR_TYPE_CONFIG[error.type || "runtime"];
              const frames = error.stack ? parseStackTrace(error.stack) : [];
              const appFrames = frames.filter((f) => f.isApp);
              const showAll = showAllFrames[error.id] || false;
              const displayFrames = showAll ? frames : appFrames.length > 0 ? appFrames : frames.slice(0, 5);

              return (
                <div key={error.id} className="group">
                  <button
                    onClick={() => toggleExpand(error.id)}
                    className="w-full text-left px-4 py-3 hover:bg-white/3 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeConfig.color} ${typeConfig.bg}`}>
                            {typeConfig.label}
                          </span>
                          {error.source && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {error.source}
                              {error.line ? `:${error.line}` : ""}
                              {error.column ? `:${error.column}` : ""}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {error.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-red-300 font-mono break-all leading-relaxed">
                          {error.message}
                        </p>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {frames.length > 0 && (
                        <div className="bg-black/30 rounded-md border border-border/20 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                              Stack Trace
                            </span>
                            {frames.length > appFrames.length && appFrames.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowAllFrames((prev) => ({ ...prev, [error.id]: !prev[error.id] }));
                                }}
                                className="text-[10px] text-blue-400 hover:text-blue-300"
                              >
                                {showAll ? "Show app frames only" : `Show all ${frames.length} frames`}
                              </button>
                            )}
                          </div>
                          <div className="divide-y divide-border/10">
                            {displayFrames.map((frame, i) => (
                              <div
                                key={i}
                                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono ${
                                  frame.isApp ? "bg-red-500/5" : "opacity-50"
                                } ${frame.isApp && onGoToFile && frame.fileName ? "cursor-pointer hover:bg-red-500/10" : ""}`}
                                onClick={() => {
                                  if (frame.isApp && onGoToFile && frame.fileName) {
                                    onGoToFile(frame.fileName, frame.lineNumber, frame.columnNumber);
                                  }
                                }}
                              >
                                <FileCode className={`w-3 h-3 shrink-0 ${frame.isApp ? "text-red-400" : "text-muted-foreground"}`} />
                                <span className="text-muted-foreground">{frame.functionName}</span>
                                {frame.fileName && (
                                  <>
                                    <span className="text-muted-foreground/50">in</span>
                                    <span className={frame.isApp ? "text-blue-400" : "text-muted-foreground"}>
                                      {frame.fileName.split("/").pop()}
                                    </span>
                                    <span className="text-muted-foreground/50">
                                      :{frame.lineNumber}:{frame.columnNumber}
                                    </span>
                                    {frame.isApp && onGoToFile && (
                                      <ExternalLink className="w-2.5 h-2.5 text-blue-400 ml-auto shrink-0" />
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {error.stack && !frames.length && (
                        <pre className="bg-black/30 rounded-md p-3 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap border border-border/20">
                          {error.stack}
                        </pre>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        {onFixWithAI && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                            onClick={() => onFixWithAI(error)}
                          >
                            <Sparkles className="w-3 h-3 mr-1.5" />
                            Fix with AI
                          </Button>
                        )}
                        {error.source && error.line && onGoToFile && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onGoToFile(error.source!, error.line!, error.column || 1)}
                          >
                            <FileCode className="w-3 h-3 mr-1.5" />
                            Go to Source
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => copyError(error)}
                        >
                          {copiedId === error.id ? (
                            <Check className="w-3 h-3 mr-1.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 mr-1.5" />
                          )}
                          {copiedId === error.id ? "Copied" : "Copy"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs ml-auto text-muted-foreground"
                          onClick={() => onDismiss(error.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2 bg-muted/10 border-t border-border/20">
            <p className="text-[10px] text-muted-foreground">
              This error occurred in your application&apos;s preview. Click on app frames to navigate to the source file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
