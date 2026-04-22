import { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertCircle, AlertTriangle, Info, Lightbulb, Filter,
  RefreshCw, X, ChevronDown, FileCode, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_BASE = import.meta.env.VITE_API_URL || "";

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  source: string;
  rule?: string;
}

const SEVERITY_CONFIG = {
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Error" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Warning" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", label: "Info" },
  hint: { icon: Lightbulb, color: "text-green-400", bg: "bg-green-500/10", label: "Hint" },
};

interface ProblemsPanelProps {
  files: Array<{ name: string; content: string }>;
  onNavigate?: (file: string, line: number, column: number) => void;
  onSetMarkers?: (diagnostics: Diagnostic[]) => void;
}

export default function ProblemsPanel({ files, onNavigate, onSetMarkers }: ProblemsPanelProps) {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterSeverities, setFilterSeverities] = useState<Set<string>>(
    new Set(["error", "warning", "info", "hint"])
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const runLint = useCallback(async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/lint/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ files }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data.diagnostics || []);
        onSetMarkers?.(data.diagnostics || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [files, onSetMarkers]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runLint, 1000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runLint]);

  const filtered = diagnostics.filter((d) => filterSeverities.has(d.severity));

  const groupedByFile = filtered.reduce<Record<string, Diagnostic[]>>((acc, d) => {
    (acc[d.file] ||= []).push(d);
    return acc;
  }, {});

  const counts = {
    error: diagnostics.filter((d) => d.severity === "error").length,
    warning: diagnostics.filter((d) => d.severity === "warning").length,
    info: diagnostics.filter((d) => d.severity === "info").length,
    hint: diagnostics.filter((d) => d.severity === "hint").length,
  };

  const toggleCollapsed = (file: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  const toggleSeverity = (sev: string) => {
    setFilterSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)] text-sm" data-testid="problems-panel">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[hsl(222,47%,13%)] shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Problems</span>
          <div className="flex items-center gap-2 text-xs">
            {counts.error > 0 && (
              <span className="flex items-center gap-1 text-red-400" data-testid="count-errors">
                <AlertCircle className="w-3 h-3" /> {counts.error}
              </span>
            )}
            {counts.warning > 0 && (
              <span className="flex items-center gap-1 text-yellow-400" data-testid="count-warnings">
                <AlertTriangle className="w-3 h-3" /> {counts.warning}
              </span>
            )}
            {(counts.info + counts.hint) > 0 && (
              <span className="flex items-center gap-1 text-blue-400" data-testid="count-info">
                <Info className="w-3 h-3" /> {counts.info + counts.hint}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="button-filter">
                <Filter className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["error", "warning", "info", "hint"] as const).map((sev) => (
                <DropdownMenuCheckboxItem
                  key={sev}
                  checked={filterSeverities.has(sev)}
                  onCheckedChange={() => toggleSeverity(sev)}
                >
                  <span className={`flex items-center gap-2 ${SEVERITY_CONFIG[sev].color}`}>
                    {(() => { const Icon = SEVERITY_CONFIG[sev].icon; return <Icon className="w-3 h-3" />; })()}
                    {SEVERITY_CONFIG[sev].label} ({counts[sev]})
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={runLint} disabled={loading} data-testid="button-refresh-lint">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" data-testid="problems-list">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 py-8">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-xs">
              {diagnostics.length === 0 ? "No problems detected" : "All problems are filtered out"}
            </p>
          </div>
        ) : (
          Object.entries(groupedByFile).map(([file, issues]) => (
            <div key={file}>
              <button
                onClick={() => toggleCollapsed(file)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5 transition-colors"
                data-testid={`file-group-${file}`}
              >
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${collapsed.has(file) ? "-rotate-90" : ""}`} />
                <FileCode className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium truncate">{file}</span>
                <span className="text-muted-foreground/60 ml-auto shrink-0">{issues.length}</span>
              </button>
              {!collapsed.has(file) && issues.map((d, idx) => {
                const config = SEVERITY_CONFIG[d.severity];
                const Icon = config.icon;
                return (
                  <button
                    key={`${d.file}-${d.line}-${d.column}-${idx}`}
                    onClick={() => onNavigate?.(d.file, d.line, d.column)}
                    className="w-full flex items-start gap-2 px-3 pl-8 py-1 text-xs hover:bg-white/5 transition-colors text-left group"
                    data-testid={`problem-${d.severity}-${d.line}`}
                  >
                    <Icon className={`w-3 h-3 shrink-0 mt-0.5 ${config.color}`} />
                    <span className="flex-1 min-w-0">
                      <span className="text-foreground/90">{d.message}</span>
                      {d.rule && (
                        <span className="text-muted-foreground/50 ml-1.5">{d.source}({d.rule})</span>
                      )}
                    </span>
                    <span className="text-muted-foreground/40 shrink-0 tabular-nums group-hover:text-muted-foreground">
                      [{d.line},{d.column}]
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
